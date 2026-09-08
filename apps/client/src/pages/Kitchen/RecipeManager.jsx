import React, { useState, useEffect, useMemo } from 'react';
import { Box, Plus, Trash2, Utensils, Scale, Layers, Save, RotateCcw, AlertCircle, Check, X, Package, Tag, DollarSign } from 'lucide-react';
import recipeApi from '../../services/recipeApi';
import itemApi from '../../services/itemApi';
import inventoryApi from '../../services/inventoryApi';
import categoryApi from '../../services/categoryApi';
import unitApi from '../../services/unitApi';
import ReactSelect from '../../components/ui/ReactSelect';
import toast from 'react-hot-toast';

export default function RecipeManager() {
  const [dishes, setDishes] = useState([]);
  const [selectedDish, setSelectedDish] = useState(null);

  const [rawItems, setRawItems] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [recipeSummary, setRecipeSummary] = useState(null);

  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty] = useState('');

  // ── Raw Item Modal State ──
  const [showRawItemModal, setShowRawItemModal] = useState(false);
  const [rawItemForm, setRawItemForm] = useState({
    name: '',
    code: '',
    category: '',
    subCategory: '',
    unit: 'pcs',
    openingStock: '',
    minStock: '',
    maxStock: '',
    avgCostPrice: '',
    salePrice: '',
    manageStock: true,
    isPosVisible: true,
    isBoxEnabled: false,
    unitsPerBox: '8'
  });
  const [categoriesList, setCategoriesList] = useState([]);
  const [unitsList, setUnitsList] = useState([]);
  const [creatingRawItem, setCreatingRawItem] = useState(false);

  // ── ReactSelect Options ──
  const dishOptions = useMemo(() =>
    dishes.map((item) => ({
      value: String(item.id),
      label: `${item.name} (${item.unit})`
    }))
  , [dishes]);

  const rawItemOptions = useMemo(() =>
    rawItems.map((item) => ({
      value: String(item.id),
      label: `${item.name} (${item.unit}) — Stock: ${Number(item.currentStock || 0).toLocaleString()}`
    }))
  , [rawItems]);

  const unitOptions = useMemo(() => [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'g', label: 'Grams (g)' },
    { value: 'ltr', label: 'Litre (ltr)' },
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'ml', label: 'Millilitre (ml)' },
    { value: 'degh', label: 'Degh / Batch' }
  ], []);

  const recipeUnitOptions = useMemo(() => [
    { value: 'degh', label: 'Degh / Batch' },
    { value: 'plate', label: 'Plate' },
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'pcs', label: 'Pieces (pcs)' }
  ], []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDishData, setNewDishData] = useState({
    name: '',
    code: '',
    unit: 'degh',
    salePrice: '',
    category: ''
  });
  const [creatingDish, setCreatingDish] = useState(false);

  // ── 1. Initial Load ──
  useEffect(() => {
    fetchItemsAndInventory();
  }, []);

  // ── 2. Fetch Recipe when Dish changes ──
  useEffect(() => {
    if (selectedDish) {
      fetchRecipe(selectedDish.id);
    } else {
      setSavedItems([]);
      setPendingItems([]);
      setRecipeSummary(null);
    }
  }, [selectedDish]);

  // ── Fetch Items (Dishes) and Inventory ──
  const fetchItemsAndInventory = async () => {
  try {
    setLoading(true);
    const [itemRes, invRes, catRes, unitRes] = await Promise.all([
      itemApi.getAll(),
      inventoryApi.getAll(),
      categoryApi.getAll({ scope: 'INVENTORY' }),
      unitApi.getAll({ scope: 'INVENTORY' })
    ]);

    const itemsList = itemRes?.data?.data || itemRes?.data || itemRes || [];
    const validDishes = Array.isArray(itemsList) ? itemsList : [];
    setDishes(validDishes);

    const inventoryList = invRes?.data?.data || invRes?.data || invRes || [];
    setRawItems(Array.isArray(inventoryList) ? inventoryList : []);

    const categoriesData = catRes?.data || catRes || [];
    setCategoriesList(Array.isArray(categoriesData) ? categoriesData : []);

    const unitsData = unitRes?.data || unitRes || [];
    setUnitsList(Array.isArray(unitsData) ? unitsData : []);
  } catch (err) {
    console.error('Failed to load items or inventory items', err);
    toast.error('Failed to load dropdown items');
  } finally {
    setLoading(false);
  }
};

  // ── Fetch Recipe for selected Item ──
  const fetchRecipe = async (itemId) => {
    try {
      setLoading(true);
      // ✅ getItemRecipe use karo (menuItemId nahi)
      const res = await recipeApi.getItemRecipe(itemId);
      const data = res?.data?.data || res?.data || {};
      setSavedItems(data.ingredients || []);
      setRecipeSummary(data.summary || null);
      setPendingItems([]);
    } catch (err) {
      console.error('Failed to fetch recipe', err);
      setSavedItems([]);
      setRecipeSummary(null);
    } finally {
      setLoading(false);
    }
  };

  // ── 3. Add to PENDING queue ──
  const handleQueueIngredient = (e) => {
    e.preventDefault();
    if (!selectedDish) {
      toast.error('Please select a dish first.');
      return;
    }
    if (!selectedIngredient || !quantity) {
      toast.error('Please select an ingredient and enter quantity.');
      return;
    }

    const ingredient = rawItems.find(i => i.id === parseInt(selectedIngredient));
    if (!ingredient) return;

    const existsSaved = savedItems.some(s => s.inventoryItemId === parseInt(selectedIngredient));
    const existsPending = pendingItems.some(p => p.ingredientId === parseInt(selectedIngredient));
    if (existsSaved || existsPending) {
      toast.error('This ingredient is already in the recipe.');
      return;
    }

    const newItem = {
      _id: `pending_${Date.now()}`,
      ingredientId: parseInt(selectedIngredient),
      ingredient: ingredient,
      name: ingredient.name,
      unit: unit,
      quantity: parseFloat(quantity),
      liveCostPerUnit: parseFloat(ingredient.avgCostPrice || ingredient.lastCostPrice || 0)
    };

    setPendingItems(prev => [...prev, newItem]);
    setSelectedIngredient('');
    setQuantity('');
    toast.success(`${ingredient.name} added to recipe draft.`);
  };

  const handleRemovePending = (pendingId) => {
    setPendingItems(prev => prev.filter(p => p._id !== pendingId));
  };

  // ── 4. SAVE RECIPE ──
  const handleSaveRecipe = async () => {
    if (pendingItems.length === 0) {
      toast.error('No new ingredients to save.');
      return;
    }
    if (!selectedDish) {
      toast.error('Please select a dish first.');
      return;
    }

    setSaving(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const item of pendingItems) {
        try {
          // ✅ itemId use karo (menuItemId nahi)
          await recipeApi.addIngredient({
            itemId: selectedDish.id,
            inventoryItemId: item.ingredientId,
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            costPerUnit: item.liveCostPerUnit
          });
          successCount++;
        } catch (err) {
          console.error('Failed to save item:', item.name, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} ingredient(s) saved successfully!`);
        setPendingItems([]);
        fetchRecipe(selectedDish.id);
      }
      if (failCount > 0) {
        toast.error(`${failCount} item(s) failed to save.`);
      }
    } catch (err) {
      console.error('Save recipe error:', err);
      toast.error('Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  // ── 5. Inline Edit Quantity ──
  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditQty(item.quantity);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditQty('');
  };

  const handleUpdateItem = async (item) => {
    if (!editQty || parseFloat(editQty) <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    try {
      setSaving(true);
      await recipeApi.updateIngredient(item.id, {
        quantity: parseFloat(editQty),
        unit: item.unit
      });
      toast.success('Quantity updated');
      setEditingId(null);
      fetchRecipe(selectedDish.id);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  // ── 6. Delete Saved Item ──
  const handleDeleteItem = async (recipeIngredientId) => {
    if (!window.confirm('Remove this ingredient from recipe?')) return;
    try {
      await recipeApi.deleteIngredient(recipeIngredientId);
      toast.success('Ingredient removed.');
      fetchRecipe(selectedDish.id);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove.');
    }
  };

  // ── 7. Create New Dish Handler ──
  const handleCreateDishSubmit = async (e) => {
    e.preventDefault();
    if (!newDishData.name.trim()) {
      toast.error('Dish name is required');
      return;
    }

    try {
      setCreatingDish(true);
      // ✅ itemApi se create karo (menuApi nahi)
      const res = await itemApi.create({
        ...newDishData,
        salePrice: parseFloat(newDishData.salePrice) || 0
      });
      const createdItem = res?.data?.data || res?.data || res;
      toast.success('New dish created successfully!');
      setIsModalOpen(false);
      setNewDishData({ name: '', code: '', unit: 'degh', salePrice: '', category: '' });
      
      await fetchItemsAndInventory();
      if (createdItem && createdItem.id) {
        setSelectedDish(createdItem);
      }
    } catch (err) {
      console.error('Failed to create dish', err);
      toast.error(err?.response?.data?.message || 'Failed to create dish');
    } finally {
      setCreatingDish(false);
    }
  };
  // ── 9. Create Raw Inventory Item ──
const handleCreateRawItem = async (e) => {
  e.preventDefault();
  try {
    setCreatingRawItem(true);
    
    let finalStock = rawItemForm.openingStock ? parseFloat(rawItemForm.openingStock) : 0;
    let finalCostPrice = rawItemForm.avgCostPrice ? parseFloat(rawItemForm.avgCostPrice) : 0;
    let finalSalePrice = rawItemForm.salePrice ? parseFloat(rawItemForm.salePrice) : 0;
    const boxEnabled = Boolean(rawItemForm.isBoxEnabled);
    const unitsPerBox = parseInt(rawItemForm.unitsPerBox) || 1;

    if (boxEnabled && rawItemForm.manageStock) {
      if (rawItemForm.avgCostPrice) finalCostPrice = parseFloat(rawItemForm.avgCostPrice) / unitsPerBox;
      if (rawItemForm.salePrice) finalSalePrice = parseFloat(rawItemForm.salePrice) / unitsPerBox;
    }

    // Check & Auto-Create Category
    if (rawItemForm.category) {
      const trimmedCat = rawItemForm.category.trim();
      const foundCat = categoriesList.find(c => c.name.toLowerCase() === trimmedCat.toLowerCase());
      if (!foundCat) {
        try {
          await categoryApi.create({
            name: trimmedCat,
            scope: 'INVENTORY'
          });
        } catch (catErr) {
          console.log('Category might already exist', catErr);
        }
      }
    }

    // Check & Auto-Create Unit
    if (rawItemForm.unit) {
      const trimmedUnit = rawItemForm.unit.trim();
      const foundUnit = unitsList.find(u => u.name.toLowerCase() === trimmedUnit.toLowerCase());
      if (!foundUnit) {
        try {
          await unitApi.create({
            name: trimmedUnit,
            symbol: trimmedUnit.substring(0, 3).toLowerCase(),
            type: 'INVENTORY',
            scope: 'INVENTORY'
          });
        } catch (unitErr) {
          console.log('Unit might already exist', unitErr);
        }
      }
    }

    const payload = {
      name: rawItemForm.name.trim(),
      code: rawItemForm.code?.trim() || null,
      category: rawItemForm.category.trim(),
      subCategory: rawItemForm.subCategory?.trim() || null,
      unit: rawItemForm.unit.trim(),
      minStock: rawItemForm.minStock ? parseFloat(rawItemForm.minStock) : 0,
      maxStock: rawItemForm.maxStock ? parseFloat(rawItemForm.maxStock) : 0,
      avgCostPrice: finalCostPrice,
      salePrice: finalSalePrice,
      manageStock: rawItemForm.manageStock,
      isPosVisible: rawItemForm.isPosVisible,
      isBoxEnabled: boxEnabled,
      unitsPerBox: unitsPerBox,
      openingStock: finalStock
    };

    await inventoryApi.create(payload);
    toast.success('Raw inventory item created successfully!');
    
    setShowRawItemModal(false);
    setRawItemForm({
      name: '',
      code: '',
      category: '',
      subCategory: '',
      unit: 'pcs',
      openingStock: '',
      minStock: '',
      maxStock: '',
      avgCostPrice: '',
      salePrice: '',
      manageStock: true,
      isPosVisible: true,
      isBoxEnabled: false,
      unitsPerBox: '8'
    });
    
    // Refresh inventory items
    await fetchItemsAndInventory();
    
  } catch (err) {
    toast.error(err?.response?.data?.message || 'Error creating raw item');
  } finally {
    setCreatingRawItem(false);
  }
};

  // ── 8. Computed totals ──
  const allItems = useMemo(() => {
    const saved = savedItems.map(s => ({
      ...s,
      totalCost: (s.liveCostPerUnit || s.inventoryItem?.avgCostPrice || 0) * parseFloat(s.quantity || 0)
    }));
    const pending = pendingItems.map(p => ({
      ...p,
      totalCost: (p.liveCostPerUnit || 0) * parseFloat(p.quantity || 0)
    }));
    return { saved, pending };
  }, [savedItems, pendingItems]);

  const grandTotal = useMemo(() => {
    const savedTotal = allItems.saved.reduce((acc, s) => acc + s.totalCost, 0);
    const pendingTotal = allItems.pending.reduce((acc, p) => acc + p.totalCost, 0);
    return savedTotal + pendingTotal;
  }, [allItems]);

  const totalIngredients = savedItems.length + pendingItems.length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ═══════ HEADER ═══════ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Utensils className="text-[#2563EB]" size={28} />
            Recipe & Menu Manager
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Map raw ingredients to menu items, build drafts, and track live recipe costs.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <ReactSelect
            options={dishOptions}
            value={selectedDish ? String(selectedDish.id) : ''}
            onChange={(opt) => {
              const dish = dishes.find(d => String(d.id) === String(opt || ''));
              setSelectedDish(dish || null);
            }}
            placeholder="-- Choose Menu Item --"
          />

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-3 bg-[#2563EB] hover:bg-[#966b1a] text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={18} />
            New Menu Item
          </button>
        </div>
      </div>

      {/* ═══════ MAIN CONTENT ═══════ */}
      {selectedDish ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: Add Ingredient Form ── */}
<div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit space-y-4">
  <div className="flex items-center justify-between border-b pb-3">
    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
      <Plus size={20} className="text-[#2563EB]" />
      Add to Recipe Draft
    </h2>
    <button
      onClick={() => setShowRawItemModal(true)}
      className="px-3 py-1.5 bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] font-semibold rounded-lg text-xs transition flex items-center gap-1.5 border border-[#2563EB]/20"
    >
      <Package size={14} />
      Add Raw Item
    </button>
  </div>

  <form onSubmit={handleQueueIngredient} className="space-y-4">
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Raw Material</label>
      <ReactSelect
        options={rawItemOptions}
        value={selectedIngredient}
        onChange={(opt) => setSelectedIngredient(opt || '')}
        placeholder="-- Choose Raw Item --"
      />
    </div>

    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        Required Qty (per {selectedDish.unit})
      </label>
      <input
        type="number"
        step="0.001"
        placeholder="e.g. 10.500"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
      />
    </div>

    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
      <ReactSelect
        options={unitOptions}
        value={unit}
        onChange={(opt) => setUnit(opt || 'kg')}
        placeholder="Select Unit"
      />
    </div>

    <button
      type="submit"
      className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center justify-center gap-2"
    >
      <Plus size={18} />
      Add to Draft
    </button>
  </form>

  {/* Pending Queue Preview */}
  {pendingItems.length > 0 && (
    <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-amber-800 uppercase">Draft Queue ({pendingItems.length})</span>
        <button
          onClick={() => setPendingItems([])}
          className="text-[10px] text-red-600 hover:underline font-medium"
        >
          Clear All
        </button>
      </div>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {pendingItems.map((p) => (
          <div key={p._id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-amber-200">
            <span className="font-medium text-gray-700">{p.name}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-amber-700">{p.quantity} {p.unit}</span>
              <button onClick={() => handleRemovePending(p._id)} className="text-red-500 hover:text-red-700">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSaveRecipe}
        disabled={saving}
        className="w-full py-2.5 bg-[#2563EB] hover:bg-[#966b1a] disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-sm transition flex items-center justify-center gap-2 mt-2"
      >
        {saving ? <RotateCcw size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'Saving...' : 'Save Recipe'}
      </button>
    </div>
  )}
</div>

          {/* ── RIGHT: Recipe Table ── */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex flex-wrap justify-between items-center border-b pb-3 gap-3">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Layers size={20} className="text-[#2563EB]" />
                Recipe for: <span className="text-[#2563EB]">{selectedDish.name}</span>
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full font-medium border border-gray-200">
                  {totalIngredients} Items
                </span>
                <span className="text-xs bg-green-50 text-green-800 px-3 py-1.5 rounded-full font-bold border border-green-200">
                  Total Cost: Rs {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-gray-400">Loading Recipe...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#F1F5F9] text-gray-700 font-semibold border-b">
                    <tr>
                      <th className="p-3 rounded-l-xl">Ingredient</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-center">Unit</th>
                      <th className="p-3 text-center">Cost</th>
                      <th className="p-3 text-center">Stock</th>
                      <th className="p-3 text-center rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* SAVED ITEMS */}
                    {allItems.saved.map((rec) => {
                      const stock = Number(rec.inventoryItem?.currentStock || 0);
                      const isLow = stock < Number(rec.quantity);
                      const isEditing = editingId === rec.id;

                      return (
                        <tr key={rec.id} className="hover:bg-amber-50/20">
                          <td className="p-3 font-medium text-gray-800">
                            {rec.inventoryItem?.name || rec.name || 'Unknown'}
                            <span className="block text-[10px] text-gray-400 font-mono">{rec.inventoryItem?.code}</span>
                          </td>
                          <td className="p-3 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.001"
                                value={editQty}
                                onChange={(e) => setEditQty(e.target.value)}
                                className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-xs font-mono text-center focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <span className="font-mono font-bold text-[#2563EB]">{Number(rec.quantity).toLocaleString()}</span>
                            )}
                          </td>
                          <td className="p-3 text-center text-gray-600">{rec.unit}</td>
                          <td className="p-3 text-center font-mono text-gray-600">
                            <span className="font-bold">Rs {rec.totalCost.toFixed(2)}</span>
                            <span className="block text-[10px] text-gray-400">@ Rs {Number(rec.liveCostPerUnit || rec.inventoryItem?.avgCostPrice || 0).toFixed(2)}</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isLow ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                              {stock.toLocaleString()} {rec.inventoryItem?.unit}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => handleUpdateItem(rec)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                  <Check size={14} />
                                </button>
                                <button onClick={handleCancelEdit} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => handleStartEdit(rec)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Edit Qty">
                                  <Scale size={14} />
                                </button>
                                <button onClick={() => handleDeleteItem(rec.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="Remove">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* PENDING ITEMS */}
                    {allItems.pending.map((rec) => (
                      <tr key={rec._id} className="bg-amber-50/40 border-l-4 border-amber-400">
                        <td className="p-3 font-medium text-gray-800">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            {rec.name}
                          </span>
                          <span className="block text-[10px] text-amber-600 font-medium">Pending — click "Save Recipe"</span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-amber-700">{Number(rec.quantity).toLocaleString()}</td>
                        <td className="p-3 text-center text-amber-700">{rec.unit}</td>
                        <td className="p-3 text-center font-mono text-amber-700">
                          <span className="font-bold">Rs {rec.totalCost.toFixed(2)}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-xs text-gray-400">—</span>
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => handleRemovePending(rec._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {allItems.saved.length === 0 && allItems.pending.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-gray-400">
                          <Box size={36} className="mx-auto mb-2 opacity-40" />
                          No ingredients in this recipe yet. Add from the left form.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Grand Total Footer */}
                {(allItems.saved.length > 0 || allItems.pending.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      {pendingItems.length > 0 && (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <AlertCircle size={12} />
                          {pendingItems.length} item(s) pending draft
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">Grand Total Cost:</span>
                      <span className="text-xl font-bold text-[#2563EB] font-mono">
                        Rs {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 text-center space-y-3">
          <Scale size={48} className="mx-auto text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-700">No Menu Item Selected</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Select a menu item from the dropdown above or click "New Menu Item" to build its recipe.
          </p>
        </div>
      )}

      {/* ═══════ NEW DISH MODAL ═══════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Utensils size={20} className="text-[#2563EB]" />
                Add New Menu Item
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDishSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mutton Biryani Degh"
                  value={newDishData.name}
                  onChange={(e) => setNewDishData({ ...newDishData, name: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Item Code</label>
                  <input
                    type="text"
                    placeholder="e.g. mb1"
                    value={newDishData.code}
                    onChange={(e) => setNewDishData({ ...newDishData, code: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Recipe Unit</label>
                  <ReactSelect
                    options={recipeUnitOptions}
                    value={newDishData.unit}
                    onChange={(opt) => setNewDishData({ ...newDishData, unit: opt || 'degh' })}
                    placeholder="Select Recipe Unit"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Sale Price (Rs)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 35000"
                    value={newDishData.salePrice}
                    onChange={(e) => setNewDishData({ ...newDishData, salePrice: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Rice / Salan"
                    value={newDishData.category}
                    onChange={(e) => setNewDishData({ ...newDishData, category: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingDish}
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#966b1a] disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-sm transition flex items-center gap-2"
                >
                  {creatingDish ? 'Creating...' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
            {/* ═══════ RAW ITEM MODAL ═══════ */}
      {showRawItemModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white p-6 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Package size={20} className="text-[#2563EB]" />
                Add Raw Inventory Item
              </h3>
              <button onClick={() => setShowRawItemModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRawItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Item Name *</label>
                  <input 
                    required 
                    value={rawItemForm.name} 
                    onChange={e => setRawItemForm({...rawItemForm, name: e.target.value})} 
                    placeholder="e.g. Chicken Boneless" 
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Item Code / SKU</label>
                  <input 
                    value={rawItemForm.code} 
                    onChange={e => setRawItemForm({...rawItemForm, code: e.target.value})} 
                    placeholder="e.g. RAW-001" 
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm font-mono" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category * (Select or Type Custom)</label>
                  <input 
                    required 
                    list="raw-category-list" 
                    value={rawItemForm.category} 
                    onChange={e => setRawItemForm({...rawItemForm, category: e.target.value})} 
                    placeholder="e.g. Meat, Vegetables" 
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm bg-white" 
                  />
                  <datalist id="raw-category-list">
                    {categoriesList.map((c) => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sub Category</label>
                  <input 
                    value={rawItemForm.subCategory} 
                    onChange={e => setRawItemForm({...rawItemForm, subCategory: e.target.value})} 
                    placeholder="e.g. Boneless" 
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Base Unit * (Select or Type Custom)</label>
                  <input 
                    required
                    list="raw-unit-list" 
                    value={rawItemForm.unit} 
                    onChange={e => setRawItemForm({...rawItemForm, unit: e.target.value})} 
                    placeholder="e.g. kg, pcs" 
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm bg-white" 
                  />
                  <datalist id="raw-unit-list">
                    {unitsList.map((u) => <option key={u.id} value={u.name} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {rawItemForm.isBoxEnabled ? 'Opening Stock (In Thalas/Packs)' : 'Opening Stock'}
                  </label>
                  <input 
                    type="number" 
                    step="0.001" 
                    value={rawItemForm.openingStock} 
                    onChange={e => setRawItemForm({...rawItemForm, openingStock: e.target.value})} 
                    placeholder={rawItemForm.isBoxEnabled ? "e.g. 5 Thalas" : "0.00"} 
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm font-mono" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {rawItemForm.isBoxEnabled ? 'Min Stock Warning (In Thalas/Packs)' : 'Min Stock Warning Level'}
                  </label>
                  <input 
                    type="number" 
                    step="0.001" 
                    value={rawItemForm.minStock} 
                    onChange={e => setRawItemForm({...rawItemForm, minStock: e.target.value})} 
                    placeholder={rawItemForm.isBoxEnabled ? "e.g. 1 Thala" : "0"} 
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {rawItemForm.isBoxEnabled ? 'Cost Price (Per Whole Box Rs)' : 'Cost Price (Per Unit Rs)'}
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={rawItemForm.avgCostPrice} 
                    onChange={e => setRawItemForm({...rawItemForm, avgCostPrice: e.target.value})} 
                    placeholder="0.00" 
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm font-mono" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {rawItemForm.isBoxEnabled ? 'Sale Price (Per Whole Box Rs)' : 'Sale Price (Per Unit Rs)'}
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={rawItemForm.salePrice} 
                    onChange={e => setRawItemForm({...rawItemForm, salePrice: e.target.value})} 
                    placeholder="0.00" 
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm font-mono" 
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={rawItemForm.manageStock} 
                    onChange={e => setRawItemForm({...rawItemForm, manageStock: e.target.checked})} 
                    className="w-4 h-4 rounded text-[#2563EB]" 
                  />
                  <span className="text-xs font-bold text-gray-700">Manage Stock Levels</span>
                </label>
                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={rawItemForm.isPosVisible} 
                    onChange={e => setRawItemForm({...rawItemForm, isPosVisible: e.target.checked})} 
                    className="w-4 h-4 rounded text-[#2563EB]" 
                  />
                  <span className="text-xs font-bold text-gray-700">Show in POS Sale Screen</span>
                </label>
              </div>

              {/* Box Conversion Checkbox */}
              {rawItemForm.manageStock && (
                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={rawItemForm.isBoxEnabled} 
                      onChange={e => setRawItemForm({...rawItemForm, isBoxEnabled: e.target.checked})} 
                      className="w-4 h-4 rounded text-[#2563EB]" 
                    />
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Box size={15} /> Save stock in Cartons / Thalas (Auto-convert to units)
                    </span>
                  </label>

                  {rawItemForm.isBoxEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Units per Pack / Thala</label>
                        <input 
                          type="number" 
                          value={rawItemForm.unitsPerBox} 
                          onChange={e => setRawItemForm({...rawItemForm, unitsPerBox: e.target.value})} 
                          placeholder="50" 
                          className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-sm font-mono" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Opening Stock in Thalas</label>
                        <input 
                          type="number" 
                          step="0.001" 
                          value={rawItemForm.openingStock} 
                          onChange={e => setRawItemForm({...rawItemForm, openingStock: e.target.value})} 
                          placeholder="e.g. 5" 
                          className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-sm font-mono font-bold text-[#2563EB]" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowRawItemModal(false)} 
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creatingRawItem}
                  className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#966b1a] disabled:opacity-50 text-white font-semibold rounded-xl shadow-md text-sm transition flex items-center gap-2"
                >
                  {creatingRawItem ? 'Creating...' : 'Create Raw Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}