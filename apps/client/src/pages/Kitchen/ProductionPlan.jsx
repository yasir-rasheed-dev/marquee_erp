import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardList, Plus, Trash2, X, Calendar, Play, History,
  ChefHat, AlertTriangle, CheckCircle, Clock, Search, Filter,
  Package, DollarSign, Layers, ArrowRight, Loader2, Eye,
  RefreshCw, Edit, ChevronDown, ChevronUp, User, Phone,
  FileText, Printer, Download, AlertCircle
} from 'lucide-react';
import productionPlanApi from '../../services/productionApi';
import bookingApi from '../../services/bookingApi';
import inventoryApi from '../../services/inventoryApi';
import kitchenOrderApi from '../../services/kitchenOrderApi';
import recipeApi from '../../services/recipeApi';
import itemApi from '../../services/itemApi';
import menuApi from '../../services/menuApi';
import packageApi from '../../services/packageApi';
import ReactSelect from '../../components/ui/ReactSelect';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  planned: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200'
};

const STATUS_LABELS = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

const STATUS_ICONS = {
  planned: <Clock size={14} className="text-blue-500" />,
  in_progress: <Play size={14} className="text-amber-500" />,
  completed: <CheckCircle size={14} className="text-green-500" />,
  cancelled: <X size={14} className="text-red-500" />
};

export default function ProductionPlan() {
  // ── Main Data ──
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [items, setItems] = useState([]);

  // ── Filters ──
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // ── Modals ──
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // ── Selected Plan ──
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planItems, setPlanItems] = useState([]);
  const [planHistory, setPlanHistory] = useState([]);

  // ── Create Form ──
  const [createForm, setCreateForm] = useState({
    bookingId: '',
    planDate: '',
    notes: '',
    autoFillRecipes: true
  });
  const [createPreviewItems, setCreatePreviewItems] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [editForm, setEditForm] = useState({
    planDate: '',
    notes: '',
    status: ''
  });

  const [addItemForm, setAddItemForm] = useState({
    inventoryItemId: '',
    itemId: '',
    quantity: '',
    unit: 'kg',
    notes: ''
  });

  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── ReactSelect Options ──
  const statusOptions = useMemo(() => [
    { value: '', label: 'All Status' },
    { value: 'planned', label: 'Planned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ], []);

  const editStatusOptions = useMemo(() => [
    { value: 'planned', label: 'Planned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ], []);

  const bookingOptions = useMemo(() =>
    bookings.map((b) => ({
      value: String(b.id),
      label: `${b.bookingNo} - ${b.title} (${b.guestName}) - ${b.guestCount} guests`
    }))
  , [bookings]);

  const inventoryItemOptions = useMemo(() =>
    inventoryItems.map((item) => ({
      value: String(item.id),
      label: `${item.name} (${item.unit}) — Stock: ${Number(item.currentStock || 0).toLocaleString()}`
    }))
  , [inventoryItems]);

  const itemOptions = useMemo(() =>
    items.map((item) => ({
      value: String(item.id),
      label: `${item.name} (${item.unit || ''})`
    }))
  , [items]);

  const unitOptions = useMemo(() => [
    { value: 'kg', label: 'kg' },
    { value: 'g', label: 'g' },
    { value: 'ltr', label: 'ltr' },
    { value: 'pcs', label: 'pcs' },
    { value: 'degh', label: 'degh' },
    { value: 'box', label: 'box' }
  ], []);

  // ── Fetch Functions ──
  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await productionPlanApi.getAll(params);
      let planData = [];
      if (res?.data?.success && Array.isArray(res.data.data)) {
        planData = res.data.data;
      } else if (Array.isArray(res?.data)) {
        planData = res.data;
      } else if (res?.data?.data && Array.isArray(res.data.data)) {
        planData = res.data.data;
      }
      setPlans(planData);
    } catch (err) {
      console.error('fetchPlans error:', err);
      toast.error('Failed to load production plans');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, startDate, endDate]);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await bookingApi.getAll({ limit: 200 });
      let data = [];
      if (res?.data?.success && Array.isArray(res.data.data)) {
        data = res.data.data;
      } else if (Array.isArray(res?.data)) {
        data = res.data;
      } else if (res?.data?.data && Array.isArray(res.data.data)) {
        data = res.data.data;
      }
      setBookings(data);
    } catch (err) {
      console.error('fetchBookings error:', err);
      setBookings([]);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await inventoryApi.getAll({ isActive: true });
      let data = [];
      if (res?.data?.success && Array.isArray(res.data.data)) {
        data = res.data.data;
      } else if (Array.isArray(res?.data)) {
        data = res.data;
      } else if (res?.data?.data && Array.isArray(res.data.data)) {
        data = res.data.data;
      }
      setInventoryItems(data);
    } catch (err) {
      console.error('fetchInventory error:', err);
      setInventoryItems([]);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const res = await itemApi.getAll({ isActive: true });
      let data = [];
      if (res?.data?.success && Array.isArray(res.data.data)) {
        data = res.data.data;
      } else if (Array.isArray(res?.data)) {
        data = res.data;
      }
      setItems(data);
    } catch (err) {
      console.error('fetchItems error:', err);
      setItems([]);
    }
  }, []);

  // ── Initial Load ──
  useEffect(() => {
    fetchPlans();
    fetchBookings();
    fetchInventory();
    fetchItems();
  }, [fetchPlans, fetchBookings, fetchInventory, fetchItems]);

  // ── Auto-fill preview when booking changes ──
  useEffect(() => {
    if (!createForm.bookingId) {
      setCreatePreviewItems([]);
      return;
    }

    const fetchPreview = async () => {
      setLoadingPreview(true);
      try {
        // ── Ensure items are loaded ──
        let localItems = items;
        if (localItems.length === 0) {
          console.log('🔄 items empty, fetching now...');
          const res = await itemApi.getAll({ isActive: true });
          let data = [];
          if (res?.data?.success && Array.isArray(res.data.data)) {
            data = res.data.data;
          } else if (Array.isArray(res?.data)) {
            data = res.data;
          }
          localItems = data;
          setItems(data);
        }

        const bookingRes = await bookingApi.getById(createForm.bookingId);
        let booking = bookingRes?.data?.data || bookingRes?.data || bookingRes;
        if (!booking) {
          setCreatePreviewItems([]);
          return;
        }

        console.log('📦 Full booking:', booking);
        console.log('📌 Custom items from booking:', booking.customItems);

        let menus = booking.menus || [];
        let customItems = booking.customItems || booking.custom_items || [];
        let packageData = booking.selectedPackage || null;

        let dishMap = {};

        // ── Process standalone menus ──
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
                  if (dish.id) {
                    if (!dishMap[dish.id]) {
                      dishMap[dish.id] = { dishId: dish.id, name: dish.name, unit: dish.unit || 'plate', totalQty: 0 };
                    }
                    dishMap[dish.id].totalQty += totalQty;
                  }
                });
              }
            } catch (err) {
              console.error(`Failed to fetch menu ${menuId}:`, err);
            }
          }
        }

        // ── Process package ──
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
                        if (dish.id) {
                          if (!dishMap[dish.id]) {
                            dishMap[dish.id] = { dishId: dish.id, name: dish.name, unit: dish.unit || 'plate', totalQty: 0 };
                          }
                          dishMap[dish.id].totalQty += totalQty;
                        }
                      });
                    }
                  } catch (err) {
                    console.error(`Failed to fetch package menu ${menuId}:`, err);
                  }
                }
              }
            }
          } catch (err) {
            console.error('Failed to fetch package:', err);
          }
        }

        let ingredientMap = {};

        // ── 3. For each menu dish, fetch recipe ──
        for (const dishId of Object.keys(dishMap)) {
          const dish = dishMap[dishId];
          try {
            const recipeRes = await recipeApi.getItemRecipe(dishId);
            const recipeData = recipeRes?.data?.data || recipeRes?.data || {};
            const ingredients = recipeData.ingredients || [];
            ingredients.forEach(ing => {
              const invId = ing.inventoryItemId;
              if (invId) {
                const qty = Number(ing.quantity || 0) * dish.totalQty;
                if (!ingredientMap[invId]) {
                  ingredientMap[invId] = {
                    inventoryItemId: invId,
                    name: ing.inventoryItem?.name || ing.name || 'Unknown',
                    unit: ing.unit || 'kg',
                    totalQty: 0
                  };
                }
                ingredientMap[invId].totalQty += qty;
              }
            });
          } catch (err) {
            console.error(`Failed to fetch recipe for dish ${dishId}:`, err);
          }
        }

        // ── 4. Handle custom items ──
        for (const c of customItems) {
          const qty = Number(c.quantity) || 1;
          
          // 🔥 HAR POSSIBLE KEY CHECK KARO
          let itemName = c.itemName || c.name || c.menuName || c.dishName || c.title || '';
          if (!itemName && c.menu && c.menu.name) itemName = c.menu.name;
          if (!itemName && c.item && c.item.name) itemName = c.item.name;
          if (!itemName && c.dish && c.dish.name) itemName = c.dish.name;
          if (!itemName && c.inventoryItem && c.inventoryItem.name) itemName = c.inventoryItem.name;

          // 🔥 Agar ab bhi empty hai to default naam de do
          if (!itemName) {
            itemName = `Custom Item (ID: ${c.id || 'unknown'})`;
            console.warn('⚠️ No name found, using default:', itemName);
          }

          console.log('🔍 Extracted custom item name:', itemName);
          console.log('📋 Available item names:', localItems.map(m => m.name));

          // ── Match-Versuche ──

          // 1. Exakter Match (case-insensitive, trimmed)
          let matchedItem = localItems.find(
            m => m.name.trim().toLowerCase() === itemName.trim().toLowerCase()
          );

          // 2. Partial Match (enthält sich gegenseitig)
          if (!matchedItem) {
            matchedItem = localItems.find(
              m => itemName.trim().toLowerCase().includes(m.name.trim().toLowerCase()) ||
                   m.name.trim().toLowerCase().includes(itemName.trim().toLowerCase())
            );
          }

          // 3. Fallback: nochmal alle Items ohne isActive-Filter laden
          if (!matchedItem) {
            console.warn('⚠️ No match found in localItems, trying without isActive filter...');
            try {
              const resAll = await itemApi.getAll({});
              let allItems = [];
              if (resAll?.data?.success && Array.isArray(resAll.data.data)) {
                allItems = resAll.data.data;
              } else if (Array.isArray(resAll?.data)) {
                allItems = resAll.data;
              }
              matchedItem = allItems.find(
                m => m.name.trim().toLowerCase() === itemName.trim().toLowerCase()
              );
              if (matchedItem) {
                console.log('✅ Found after removing isActive filter:', matchedItem.name);
              }
            } catch (err) {
              console.error('Failed to fetch all items:', err);
            }
          }

          if (matchedItem) {
            console.log('✅ Matched to item:', matchedItem.name);
            try {
              const recipeRes = await recipeApi.getItemRecipe(matchedItem.id);
              const recipeData = recipeRes?.data?.data || recipeRes?.data || {};
              const ingredients = recipeData.ingredients || [];
              ingredients.forEach(ing => {
                const invId = ing.inventoryItemId;
                if (invId) {
                  const ingQty = Number(ing.quantity || 0) * qty;
                  if (!ingredientMap[invId]) {
                    ingredientMap[invId] = {
                      inventoryItemId: invId,
                      name: ing.inventoryItem?.name || ing.name || 'Unknown',
                      unit: ing.unit || 'kg',
                      totalQty: 0
                    };
                  }
                  ingredientMap[invId].totalQty += ingQty;
                }
              });
            } catch (err) {
              console.error(`Failed to fetch recipe for custom item matched to item ${matchedItem.id}:`, err);
            }
          } else {
            // Fallback: match with inventory directly
            const matchedInv = inventoryItems.find(
              i => i.name.trim().toLowerCase() === itemName.trim().toLowerCase()
            );
            if (matchedInv) {
              const invId = matchedInv.id;
              if (!ingredientMap[invId]) {
                ingredientMap[invId] = {
                  inventoryItemId: invId,
                  name: matchedInv.name,
                  unit: matchedInv.unit || 'kg',
                  totalQty: 0
                };
              }
              ingredientMap[invId].totalQty += qty;
            } else {
              // Ultimate fallback: add custom item itself with proper name
              console.warn('⚠️ No match found, adding as raw item:', itemName);
              const rawId = `raw_${Date.now()}_${Math.random()}`;
              ingredientMap[rawId] = {
                inventoryItemId: null,
                name: itemName,
                unit: c.unit || 'pcs',
                totalQty: qty,
                isCustom: true
              };
            }
          }
        }

        const previewItems = Object.values(ingredientMap);
        console.log('📊 Final preview items:', previewItems);
        setCreatePreviewItems(previewItems);
      } catch (err) {
        console.error('Error fetching preview:', err);
        setCreatePreviewItems([]);
      } finally {
        setLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [createForm.bookingId, inventoryItems, items]);

  // ── Open Detail ──
  const openDetail = async (plan) => {
    try {
      setLoading(true);
      const res = await productionPlanApi.getById(plan.id);
      const data = res?.data?.data || res?.data || {};
      setSelectedPlan(data);
      setPlanItems(data.items || []);
      setEditForm({
        planDate: data.planDate?.split('T')[0] || '',
        notes: data.notes || '',
        status: data.status || ''
      });
      setShowDetail(true);
    } catch (err) {
      toast.error('Failed to load plan details');
      console.error('openDetail error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Open History ──
  const openHistory = async (plan) => {
    try {
      setLoading(true);
      const res = await productionPlanApi.getHistory(plan.id);
      const historyData = res?.data?.data || res?.data || [];
      const transactions = Array.isArray(historyData) ? historyData : (historyData.transactions || []);
      setPlanHistory(transactions);
      setShowHistory(true);
    } catch (err) {
      toast.error('Failed to load history');
      console.error('openHistory error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Create Plan (with items from preview) ──
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.bookingId || !createForm.planDate) {
      toast.error('Booking and Plan Date are required');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        bookingId: parseInt(createForm.bookingId),
        planDate: createForm.planDate,
        notes: createForm.notes || '',
        autoFillRecipes: false,
        items: createPreviewItems.map(item => ({
          inventoryItemId: item.inventoryItemId,
          quantity: item.totalQty,
          unit: item.unit,
          notes: ''
        }))
      };
      await productionPlanApi.create(payload);
      toast.success('Production plan created successfully');
      setShowCreate(false);
      setCreateForm({ bookingId: '', planDate: '', notes: '', autoFillRecipes: true });
      setCreatePreviewItems([]);
      fetchPlans();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create plan');
      console.error('handleCreate error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Update Plan ──
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;
    try {
      setSaving(true);
      const payload = {
        planDate: editForm.planDate,
        notes: editForm.notes,
        status: editForm.status
      };
      await productionPlanApi.update(selectedPlan.id, payload);
      toast.success('Plan updated successfully');
      setShowEdit(false);
      fetchPlans();
      const refreshed = await productionPlanApi.getById(selectedPlan.id);
      const data = refreshed?.data?.data || refreshed?.data || {};
      setSelectedPlan(data);
      setPlanItems(data.items || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update plan');
      console.error('handleUpdate error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Preview Inventory Impact ──
  const handlePreview = async () => {
    if (!selectedPlan) return;
    try {
      setPreviewLoading(true);
      const res = await productionPlanApi.preview(selectedPlan.id);
      setPreviewData(res?.data?.data || null);
      setShowPreview(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load preview');
      console.error('handlePreview error:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── Execute Plan ──
  const handleExecute = async () => {
    if (!selectedPlan) return;
    if (!window.confirm('⚠️ Execute this plan? This will deduct stock from inventory.')) return;

    try {
      setExecuting(true);
      const res = await productionPlanApi.execute(selectedPlan.id);
      toast.success(res?.data?.message || 'Plan executed successfully');

      const refreshed = await productionPlanApi.getById(selectedPlan.id);
      const data = refreshed?.data?.data || refreshed?.data || {};
      setSelectedPlan(data);
      setPlanItems(data.items || []);
      fetchPlans();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Execution failed';
      const shortages = err?.response?.data?.shortageItems;
      if (shortages && shortages.length > 0) {
        toast.error(`${msg} — ${shortages.length} item(s) shortage`);
        console.error('Shortage items:', shortages);
      } else {
        toast.error(msg);
      }
      console.error('handleExecute error:', err);
    } finally {
      setExecuting(false);
    }
  };

  // ── Delete Plan ──
  const handleDelete = async (plan) => {
    if (!window.confirm(`⚠️ Delete production plan for "${plan.booking?.title || plan.bookingId}"? This cannot be undone!`)) return;
    try {
      setDeleting(true);
      await productionPlanApi.delete(plan.id);
      toast.success('Plan deleted successfully');
      fetchPlans();
      if (showDetail && selectedPlan?.id === plan.id) {
        setShowDetail(false);
        setSelectedPlan(null);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
      console.error('handleDelete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  // ── Update Status ──
  const handleStatusChange = async (plan, newStatus) => {
    if (plan.status === newStatus) return;
    try {
      await productionPlanApi.update(plan.id, { status: newStatus });
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
      fetchPlans();
      if (selectedPlan?.id === plan.id) {
        setSelectedPlan({ ...selectedPlan, status: newStatus });
        setEditForm({ ...editForm, status: newStatus });
      }
    } catch (err) {
      toast.error('Failed to update status');
      console.error('handleStatusChange error:', err);
    }
  };

  // ── Add Item ──
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;
    if (!addItemForm.quantity) {
      toast.error('Quantity is required');
      return;
    }
    if (!addItemForm.inventoryItemId && !addItemForm.itemId) {
      toast.error('Please select either Inventory Item or Item');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        inventoryItemId: addItemForm.inventoryItemId ? parseInt(addItemForm.inventoryItemId) : null,
        menuItemId: addItemForm.itemId ? parseInt(addItemForm.itemId) : null,
        quantity: parseFloat(addItemForm.quantity),
        unit: addItemForm.unit || 'kg',
        notes: addItemForm.notes || ''
      };
      await productionPlanApi.addItem(selectedPlan.id, payload);
      toast.success('Item added successfully');
      setShowAddItem(false);
      setAddItemForm({ inventoryItemId: '', itemId: '', quantity: '', unit: 'kg', notes: '' });

      const refreshed = await productionPlanApi.getById(selectedPlan.id);
      const data = refreshed?.data?.data || refreshed?.data || {};
      setSelectedPlan(data);
      setPlanItems(data.items || []);
      fetchPlans();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add item');
      console.error('handleAddItem error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete Item ──
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Remove this item from the plan?')) return;
    try {
      await productionPlanApi.deleteItem(itemId);
      toast.success('Item removed');
      const refreshed = await productionPlanApi.getById(selectedPlan.id);
      const data = refreshed?.data?.data || refreshed?.data || {};
      setSelectedPlan(data);
      setPlanItems(data.items || []);
      fetchPlans();
    } catch (err) {
      toast.error('Failed to remove item');
      console.error('handleDeleteItem error:', err);
    }
  };

  // ── Create Kitchen Order from Plan ──
  const handleCreateKitchenOrder = async () => {
    if (!selectedPlan) return;
    try {
      setSaving(true);
      const response = await kitchenOrderApi.create({
        bookingId: selectedPlan.bookingId,
        priority: 'normal',
        notes: `Auto-generated from Production Plan #${selectedPlan.id}`,
        items: planItems.map(item => ({
          inventoryItemId: item.inventoryItemId,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes
        })),
        autoFillRecipes: false
      });

      if (response?.data?.success) {
        toast.success('Kitchen order created successfully!');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create kitchen order');
      console.error('handleCreateKitchenOrder error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Apply Filters ──
  const applyFilters = () => {
    fetchPlans();
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setTimeout(fetchPlans, 0);
  };

  const getBookingInfo = (bookingId) => {
    return bookings.find(b => b.id === bookingId);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ═════════════════ HEADER ═════════════════ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="text-[#A97A1F]" size={28} />
            Production Plans
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage kitchen production plans, auto-fill recipes, and execute stock deductions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setRefreshing(true); fetchPlans().finally(() => setRefreshing(false)); }}
            disabled={refreshing}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-[#A97A1F] hover:bg-[#966b1a] text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center gap-2"
          >
            <Plus size={18} /> New Plan
          </button>
        </div>
      </div>

      {/* ═════════════════ FILTERS ═════════════════ */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Search</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by booking or guest..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchPlans()}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#A97A1F] focus:outline-none"
            />
          </div>
        </div>

        <div className="w-44">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
          <ReactSelect
            options={statusOptions}
            value={statusFilter}
            onChange={opt => setStatusFilter(opt || '')}
            placeholder="All Status"
          />
        </div>

        <div className="w-44">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#A97A1F] focus:outline-none"
          />
        </div>

        <div className="w-44">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#A97A1F] focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition flex items-center gap-1.5"
          >
            <Filter size={14} /> Filter
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* ═════════════════ STATS ═════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase font-semibold">Total</div>
          <div className="text-2xl font-bold text-gray-900">{plans.length}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="text-xs text-blue-600 uppercase font-semibold">Planned</div>
          <div className="text-2xl font-bold text-blue-700">{plans.filter(p => p.status === 'planned').length}</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
          <div className="text-xs text-amber-600 uppercase font-semibold">In Progress</div>
          <div className="text-2xl font-bold text-amber-700">{plans.filter(p => p.status === 'in_progress').length}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
          <div className="text-xs text-green-600 uppercase font-semibold">Completed</div>
          <div className="text-2xl font-bold text-green-700">{plans.filter(p => p.status === 'completed').length}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
          <div className="text-xs text-red-600 uppercase font-semibold">Cancelled</div>
          <div className="text-2xl font-bold text-red-700">{plans.filter(p => p.status === 'cancelled').length}</div>
        </div>
      </div>

      {/* ═════════════════ PLANS TABLE ═════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading && plans.length === 0 ? (
          <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-2">
            <Loader2 size={32} className="animate-spin" />
            <span>Loading production plans...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F2EB] text-gray-700 font-semibold border-b">
                <tr>
                  <th className="p-4 rounded-tl-xl">Booking</th>
                  <th className="p-4">Plan Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Items</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.length > 0 ? (
                  plans.map((plan) => {
                    const booking = getBookingInfo(plan.bookingId);
                    return (
                      <tr key={plan.id} className="hover:bg-amber-50/20 transition">
                        <td className="p-4">
                          <div className="font-medium text-gray-900">
                            {booking?.title || `Booking #${plan.bookingId}`}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <User size={12} />
                            {booking?.guestName || 'Unknown'} • {booking?.bookingNo || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {booking?.guestCount || 0} guests
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <Calendar size={14} className="text-gray-400" />
                            {formatDate(plan.planDate)}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            Created: {formatDateTime(plan.createdAt)}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1 ${STATUS_STYLES[plan.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                              {STATUS_ICONS[plan.status]}
                              {STATUS_LABELS[plan.status] || plan.status}
                            </span>
                            {plan.status === 'planned' && (
                              <button
                                onClick={() => handleStatusChange(plan, 'in_progress')}
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline text-left"
                              >
                                Start Production →
                              </button>
                            )}
                            {plan.status === 'in_progress' && (
                              <button
                                onClick={() => handleStatusChange(plan, 'completed')}
                                className="text-xs text-green-600 hover:text-green-800 hover:underline text-left"
                              >
                                Complete →
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-gray-600 font-mono font-semibold text-lg">
                            {plan._count?.items || 0}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openDetail(plan)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            {plan.status === 'completed' && (
                              <button
                                onClick={() => openHistory(plan)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Stock History"
                              >
                                <History size={16} />
                              </button>
                            )}
                            {plan.status !== 'completed' && plan.status !== 'cancelled' && (
                              <button
                                onClick={() => handleStatusChange(plan, 'cancelled')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Cancel Plan"
                              >
                                <X size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(plan)}
                              disabled={deleting}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="py-16 text-center text-gray-400">
                      <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                      <p>No production plans found.</p>
                      <p className="text-xs mt-1">Create a new plan to get started.</p>
                      <button
                        onClick={() => setShowCreate(true)}
                        className="mt-4 px-4 py-2 bg-[#A97A1F] text-white rounded-lg hover:bg-[#966b1a] transition text-sm"
                      >
                        Create First Plan
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═════════════════ CREATE MODAL (with preview) ═════════════════ */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus size={20} className="text-[#A97A1F]" />
                New Production Plan
              </h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Booking</label>
                <ReactSelect
                  options={bookingOptions}
                  value={createForm.bookingId}
                  onChange={opt => setCreateForm({ ...createForm, bookingId: opt || '' })}
                  placeholder="-- Select Booking --"
                  isRequired
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Plan Date</label>
                <input
                  type="date"
                  value={createForm.planDate}
                  onChange={(e) => setCreateForm({ ...createForm, planDate: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#A97A1F] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes..."
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#A97A1F] focus:outline-none resize-none"
                />
              </div>

              {/* ── Preview Table ── */}
              {loadingPreview && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={20} className="animate-spin mr-2" />
                  <span className="text-sm text-gray-500">Loading ingredients...</span>
                </div>
              )}
              {!loadingPreview && createPreviewItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Ingredients to be added</h4>
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 font-medium">
                        <tr>
                          <th className="p-2 text-left">Ingredient</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-center">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {createPreviewItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2">{item.name}</td>
                            <td className="p-2 text-center font-mono font-semibold text-[#A97A1F]">
                              {Number(item.totalQty).toFixed(2)}
                            </td>
                            <td className="p-2 text-center">{item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {createPreviewItems.length} unique ingredients will be added to the plan.
                  </p>
                </div>
              )}
              {!loadingPreview && createForm.bookingId && createPreviewItems.length === 0 && (
                <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                  No ingredients found for this booking. You can add items manually after creating the plan.
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#A97A1F] hover:bg-[#966b1a] disabled:opacity-50 text-white font-medium rounded-xl text-sm transition flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {saving ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════ DETAIL MODAL ═════════════════ */}
      {showDetail && selectedPlan && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start p-5 border-b bg-gray-50/50 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ChefHat size={20} className="text-[#A97A1F]" />
                  Production Plan #{selectedPlan.id}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
                  {selectedPlan.booking?.title || `Booking #${selectedPlan.bookingId}`}
                  <span className="text-gray-300">|</span>
                  <User size={14} />
                  {selectedPlan.booking?.guestName || 'Unknown'}
                  <span className="text-gray-300">|</span>
                  <Calendar size={14} />
                  {formatDate(selectedPlan.planDate)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1 ${STATUS_STYLES[selectedPlan.status]}`}>
                  {STATUS_ICONS[selectedPlan.status]}
                  {STATUS_LABELS[selectedPlan.status]}
                </span>
                <button
                  onClick={() => setShowEdit(true)}
                  className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition"
                  title="Edit Plan"
                >
                  <Edit size={16} />
                </button>
                <button onClick={() => setShowDetail(false)} className="p-1.5 hover:bg-gray-200 rounded-lg transition">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#F5F2EB] p-4 rounded-xl">
                  <div className="text-xs text-gray-500 uppercase font-semibold">Total Items</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{planItems.length}</div>
                </div>
                <div className="bg-[#F5F2EB] p-4 rounded-xl">
                  <div className="text-xs text-gray-500 uppercase font-semibold">Est. Cost</div>
                  <div className="text-2xl font-bold text-[#A97A1F] mt-1 font-mono">
                    Rs {Number(selectedPlan.summary?.totalEstimatedCost || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-[#F5F2EB] p-4 rounded-xl">
                  <div className="text-xs text-gray-500 uppercase font-semibold">Guest Count</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {selectedPlan.booking?.guestCount || '—'}
                  </div>
                </div>
                <div className="bg-[#F5F2EB] p-4 rounded-xl">
                  <div className="text-xs text-gray-500 uppercase font-semibold">Created</div>
                  <div className="text-sm font-medium text-gray-700 mt-1">
                    {formatDateTime(selectedPlan.createdAt)}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedPlan.notes && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                  <div className="text-xs font-semibold text-amber-800 uppercase mb-1">Notes</div>
                  <p className="text-sm text-amber-900">{selectedPlan.notes}</p>
                </div>
              )}

              {/* Items Table */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Layers size={16} className="text-[#A97A1F]" />
                    Required Ingredients
                  </h4>
                  {selectedPlan.status !== 'completed' && selectedPlan.status !== 'cancelled' && (
                    <button
                      onClick={() => setShowAddItem(true)}
                      className="px-3 py-1.5 bg-[#A97A1F] hover:bg-[#966b1a] text-white text-xs font-medium rounded-lg transition flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Item
                    </button>
                  )}
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                      <tr>
                        <th className="p-3 text-left">Item</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-center">Unit</th>
                        <th className="p-3 text-center">Live Cost</th>
                        <th className="p-3 text-center">Stock</th>
                        {selectedPlan.status !== 'completed' && selectedPlan.status !== 'cancelled' && (
                          <th className="p-3 text-center">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {planItems.length > 0 ? (
                        planItems.map((item) => {
                          const stock = Number(item.inventoryItem?.currentStock || 0);
                          const required = Number(item.quantity || 0);
                          const isShort = stock < required;
                          return (
                            <tr key={item.id} className="hover:bg-gray-50/50">
                              <td className="p-3">
                                <div className="font-medium text-gray-800">
                                  {item.inventoryItem?.name || item.menuItem?.name || '—'}
                                </div>
                                <div className="text-xs text-gray-400">{item.inventoryItem?.code}</div>
                              </td>
                              <td className="p-3 text-center font-mono font-semibold text-[#A97A1F]">
                                {Number(item.quantity).toLocaleString()}
                              </td>
                              <td className="p-3 text-center text-gray-600">{item.unit}</td>
                              <td className="p-3 text-center font-mono text-gray-600">
                                Rs {Number(item.liveTotalCost || 0).toFixed(2)}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${isShort ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                  {stock.toLocaleString()}
                                </span>
                              </td>
                              {selectedPlan.status !== 'completed' && selectedPlan.status !== 'cancelled' && (
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={selectedPlan.status !== 'completed' && selectedPlan.status !== 'cancelled' ? 6 : 5} className="py-8 text-center text-gray-400">
                            <Package size={28} className="mx-auto mb-2 opacity-30" />
                            No items in this plan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t bg-gray-50/50 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <button
                onClick={() => openHistory(selectedPlan)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-xl text-sm font-medium transition flex items-center gap-2"
              >
                <History size={16} /> View History
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {selectedPlan.status === 'planned' && (
                  <>
                    <button
                      onClick={handlePreview}
                      disabled={previewLoading || planItems.length === 0}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm shadow-sm transition flex items-center gap-2"
                    >
                      {previewLoading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                      {previewLoading ? 'Checking...' : 'Preview Stock'}
                    </button>
                    <button
                      onClick={handleExecute}
                      disabled={executing || planItems.length === 0}
                      className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center gap-2"
                    >
                      {executing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                      {executing ? 'Executing...' : 'Execute Plan'}
                    </button>
                  </>
                )}

                {selectedPlan.status === 'planned' && (
                  <button
                    onClick={() => handleStatusChange(selectedPlan, 'in_progress')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition flex items-center gap-2"
                  >
                    <Play size={16} /> Start Production
                  </button>
                )}

                {selectedPlan.status === 'in_progress' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(selectedPlan, 'completed')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl text-sm transition flex items-center gap-2"
                    >
                      <CheckCircle size={16} /> Complete
                    </button>
                    <button
                      onClick={handleCreateKitchenOrder}
                      disabled={saving || planItems.length === 0}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl text-sm transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <ChefHat size={16} />
                      {saving ? 'Creating...' : 'Kitchen Order'}
                    </button>
                  </>
                )}

                {selectedPlan.status === 'completed' && (
                  <span className="flex items-center gap-2 text-green-700 text-sm font-medium">
                    <CheckCircle size={18} /> Plan Executed
                  </span>
                )}

                {selectedPlan.status === 'cancelled' && (
                  <span className="flex items-center gap-2 text-red-700 text-sm font-medium">
                    <AlertTriangle size={18} /> Cancelled
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════ EDIT MODAL ═════════════════ */}
      {showEdit && selectedPlan && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[55] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Edit size={20} className="text-[#A97A1F]" />
                Edit Plan #{selectedPlan.id}
              </h3>
              <button onClick={() => setShowEdit(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Plan Date</label>
                <input
                  type="date"
                  value={editForm.planDate}
                  onChange={(e) => setEditForm({ ...editForm, planDate: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#A97A1F] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Status</label>
                <ReactSelect
                  options={editStatusOptions}
                  value={editForm.status}
                  onChange={opt => setEditForm({ ...editForm, status: opt || '' })}
                  placeholder="Select Status"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Notes</label>
                <textarea
                  rows={3}
                  placeholder="Notes..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#A97A1F] focus:outline-none resize-none"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#A97A1F] hover:bg-[#966b1a] disabled:opacity-50 text-white font-medium rounded-xl text-sm transition flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Edit size={16} />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════ ADD ITEM MODAL ═════════════════ */}
      {showAddItem && selectedPlan && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-bold text-gray-900">Add Ingredient</h3>
              <button onClick={() => setShowAddItem(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Inventory Item</label>
                <ReactSelect
                  options={inventoryItemOptions}
                  value={addItemForm.inventoryItemId}
                  onChange={opt => setAddItemForm({ ...addItemForm, inventoryItemId: opt || '', itemId: '' })}
                  placeholder="-- Select Inventory Item --"
                />
              </div>
              <div className="text-center text-gray-400 text-sm">— OR —</div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Item</label>
                <ReactSelect
                  options={itemOptions}
                  value={addItemForm.itemId}
                  onChange={opt => setAddItemForm({ ...addItemForm, itemId: opt || '', inventoryItemId: '' })}
                  placeholder="-- Select Item --"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Quantity</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={addItemForm.quantity}
                    onChange={(e) => setAddItemForm({ ...addItemForm, quantity: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#A97A1F] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Unit</label>
                  <ReactSelect
                    options={unitOptions}
                    value={addItemForm.unit}
                    onChange={opt => setAddItemForm({ ...addItemForm, unit: opt || 'kg' })}
                    placeholder="Select Unit"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional..."
                  value={addItemForm.notes}
                  onChange={(e) => setAddItemForm({ ...addItemForm, notes: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#A97A1F] focus:outline-none"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddItem(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#A97A1F] hover:bg-[#966b1a] disabled:opacity-50 text-white font-medium rounded-xl text-sm transition flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {saving ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════ PREVIEW MODAL ═════════════════ */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Eye size={20} className="text-[#A97A1F]" />
                Inventory Deduction Preview
              </h3>
              <button onClick={() => setShowPreview(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {previewData.preview?.shortages?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                    <AlertTriangle size={18} />
                    Stock Shortage Detected
                  </div>
                  <div className="space-y-2">
                    {previewData.preview.shortages.map((s, i) => (
                      <div key={i} className="flex justify-between text-sm text-red-800 bg-white/50 rounded-lg p-2">
                        <span>{s.name}</span>
                        <span className="font-mono">Need: {s.required} {s.unit} | Have: {s.available}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewData.preview?.deductions?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Package size={16} className="text-[#A97A1F]" />
                    Ingredients to be Deducted
                  </h4>
                  <div className="space-y-2">
                    {previewData.preview.deductions.map((d, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                        <div>
                          <div className="font-medium text-gray-900">{d.name}</div>
                          <div className="text-xs text-gray-500">
                            Used in: {d.usedInDishes?.map(u => u.menuItemName).join(', ')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-green-700">
                            -{Number(d.quantity).toLocaleString()} {d.unit}
                          </div>
                          <div className="text-xs text-gray-500">
                            Cost: Rs {Number(d.totalCost).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewData.planItems?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Plan Items vs Stock</h4>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 font-medium">
                        <tr>
                          <th className="p-3 text-left">Item</th>
                          <th className="p-3 text-center">Required</th>
                          <th className="p-3 text-center">Available</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {previewData.planItems.map((item, i) => {
                          const stock = Number(item.stockAvailable || 0);
                          const req = Number(item.quantity || 0);
                          const ok = stock >= req;
                          return (
                            <tr key={i}>
                              <td className="p-3">{item.inventoryItem?.name || '—'}</td>
                              <td className="p-3 text-center font-mono">{req.toLocaleString()}</td>
                              <td className="p-3 text-center font-mono">{stock.toLocaleString()}</td>
                              <td className="p-3 text-center">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                  {ok ? 'OK' : 'Short'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {previewData.preview?.dryRun && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <div className="text-blue-700 font-semibold text-sm">
                    This is a dry run — no stock was deducted
                  </div>
                  <div className="text-blue-600 text-xs mt-1">
                    Click "Execute Plan" to actually deduct inventory
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t bg-gray-50/50 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition"
              >
                Close
              </button>
              {previewData.preview?.success && (
                <button
                  onClick={() => { setShowPreview(false); handleExecute(); }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition flex items-center gap-2"
                >
                  <Play size={16} /> Proceed to Execute
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════ HISTORY MODAL ═════════════════ */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <History size={20} className="text-[#A97A1F]" />
                Stock Transaction History
              </h3>
              <button onClick={() => setShowHistory(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {planHistory.length > 0 ? (
                <div className="space-y-3">
                  {planHistory.map((tx) => (
                    <div key={tx.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="p-2 bg-red-50 text-red-600 rounded-lg flex-shrink-0">
                        <ArrowRight size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="font-medium text-gray-900 truncate">{tx.inventory?.name}</div>
                          <span className="text-xs text-gray-400 flex-shrink-0">{formatDateTime(tx.createdAt)}</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-0.5">
                          Deducted <span className="font-mono font-semibold text-red-600">{Number(tx.quantity).toLocaleString()}</span> {tx.inventory?.unit}
                          @ Rs {Number(tx.costPrice).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1 truncate">{tx.notes}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400">
                  <History size={36} className="mx-auto mb-2 opacity-30" />
                  <p>No stock transactions found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}