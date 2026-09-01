import React, { useState } from 'react';
import { 
  Plus, Search, Edit2, Trash2, X, Tag, Package, 
  TrendingUp, DollarSign, Box, History 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import inventoryApi from '../../services/inventoryApi';
import categoryApi from '../../services/categoryApi';
import unitApi from '../../services/unitApi';
import { useBranch } from '../../context/BranchContext';
import useGlobalData from '../../hooks/useGlobalData';
import ReactSelect from '../../components/ui/ReactSelect';
import toast from 'react-hot-toast';

export default function ItemMaster() {
  const { currentBranch } = useBranch();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const initialFormState = {
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
  };

  const [form, setForm] = useState(initialFormState);

  // ── Fetch Items, Inventory Categories & Inventory Units with Scope Filter ──
  const { data: fetchResult, refetch } = useGlobalData(
    async (branchId) => {
      const activeBranchId = branchId || currentBranch?.id;

      const [itemsRes, catRes, unitRes] = await Promise.all([
        inventoryApi.getAll({ search, branchId: activeBranchId }),
        categoryApi.getAll({ scope: 'INVENTORY', branchId: activeBranchId }),
        unitApi.getAll({ scope: 'INVENTORY', branchId: activeBranchId })
      ]);

      const itemsData = itemsRes?.data || itemsRes || [];
      const categoriesData = catRes?.data || catRes || [];
      const unitsData = unitRes?.data || unitRes || [];

      return { items: itemsData, categories: categoriesData, units: unitsData };
    },
    { dependencies: [search] }
  );

  const itemList = Array.isArray(fetchResult?.items) ? fetchResult.items : (Array.isArray(fetchResult) ? fetchResult : []);
  const categoriesList = Array.isArray(fetchResult?.categories) ? fetchResult.categories : [];
  const unitsList = Array.isArray(fetchResult?.units) ? fetchResult.units : [];

  const existingSubCategories = [...new Set(itemList.map(i => i.subCategory).filter(Boolean))];

  // Filters ya Search change hone par page 1 par reset karna
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, stockStatusFilter]);

  const filteredItemList = itemList.filter(item => {
    const matchesCategory = selectedCategory === 'ALL' || item.category?.toLowerCase() === selectedCategory.toLowerCase();
    const currentStock = Number(item.currentStock || 0);
    const minStock = Number(item.minStock || 0);

    let matchesStatus = true;
    if (stockStatusFilter === 'LOW') {
      matchesStatus = currentStock <= minStock && currentStock > 0;
    } else if (stockStatusFilter === 'OUT') {
      matchesStatus = currentStock === 0;
    } else if (stockStatusFilter === 'NORMAL') {
      matchesStatus = currentStock > minStock;
    }
    return matchesCategory && matchesStatus;
  });

  const totalItemsCount = filteredItemList.length;
  const totalStockUnits = filteredItemList.reduce((sum, item) => sum + Number(item.currentStock || 0), 0);
  const totalValuation = filteredItemList.reduce((sum, item) => sum + (Number(item.currentStock || 0) * Number(item.avgCostPrice || 0)), 0);

  // Pagination Math
  const totalPages = Math.ceil(totalItemsCount / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItemList = filteredItemList.slice(startIndex, startIndex + itemsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let finalStock = form.openingStock ? parseFloat(form.openingStock) : 0;
      let finalCostPrice = form.avgCostPrice ? parseFloat(form.avgCostPrice) : 0;
      let finalSalePrice = form.salePrice ? parseFloat(form.salePrice) : 0;
      const boxEnabled = Boolean(form.isBoxEnabled);
      const unitsPerBox = parseInt(form.unitsPerBox) || 1;

      if (boxEnabled && form.manageStock) {
        // Backend handles box multiplication; send raw opening stock boxes
        if (form.avgCostPrice) finalCostPrice = parseFloat(form.avgCostPrice) / unitsPerBox;
        if (form.salePrice) finalSalePrice = parseFloat(form.salePrice) / unitsPerBox;
      }

      const activeBranchId = currentBranch?.id || 1;

      // ✅ 1. Check & Auto-Create Category if it's new (Inventory Scope)
      if (form.category) {
        const trimmedCat = form.category.trim();
        const foundCat = categoriesList.find(c => c.name.toLowerCase() === trimmedCat.toLowerCase());
        if (!foundCat) {
          try {
            await categoryApi.create({
              name: trimmedCat,
              scope: 'INVENTORY',
              branchId: activeBranchId
            });
          } catch (catErr) {
            console.log('Category might already exist or handled', catErr);
          }
        }
      }

      // ✅ 2. Check & Auto-Create Unit if it's new (Inventory Scope)
      if (form.unit) {
        const trimmedUnit = form.unit.trim();
        const foundUnit = unitsList.find(u => u.name.toLowerCase() === trimmedUnit.toLowerCase());
        if (!foundUnit) {
          try {
            await unitApi.create({
              name: trimmedUnit,
              symbol: trimmedUnit.substring(0, 3).toLowerCase(),
              type: 'INVENTORY',
              scope: 'INVENTORY',
              branchId: activeBranchId
            });
          } catch (unitErr) {
            console.log('Unit might already exist or handled', unitErr);
          }
        }
      }

      const payload = { 
        name: form.name.trim(),
        code: form.code?.trim() || null,
        category: form.category.trim(),
        subCategory: form.subCategory?.trim() || null,
        unit: form.unit.trim(),
        branchId: activeBranchId,
        minStock: form.minStock ? parseFloat(form.minStock) : 0,
        maxStock: form.maxStock ? parseFloat(form.maxStock) : 0,
        avgCostPrice: finalCostPrice,
        salePrice: finalSalePrice,
        manageStock: form.manageStock,
        isPosVisible: form.isPosVisible,
        isBoxEnabled: boxEnabled,
        unitsPerBox: unitsPerBox,
        openingStock: finalStock
      };

      if (editingId) {
        await inventoryApi.update(editingId, payload);
        toast.success('Inventory item updated successfully!');
      } else {
        await inventoryApi.create(payload);
        toast.success('Inventory item created successfully!');
      }

      setShowFormModal(false);
      setEditingId(null);
      setForm(initialFormState);
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error saving inventory item');
    }
  };

  const handleEdit = (item) => {
    const isBox = Boolean(item.isBoxEnabled);
    const boxRatio = Number(item.unitsPerBox) || 1;
    const currentStockUnits = Number(item.currentStock || 0);

    // Calculate original input prices and stock in Packs/Thala if Box was enabled
    const displayStock = isBox ? (currentStockUnits / boxRatio) : currentStockUnits;
    const displayCost = (isBox && item.avgCostPrice) ? (Number(item.avgCostPrice) * boxRatio) : (item.avgCostPrice ?? '');
    const displaySale = (isBox && item.salePrice) ? (Number(item.salePrice) * boxRatio) : (item.salePrice ?? '');

    setForm({
      name: item.name,
      code: item.code || '',
      category: item.category || '',
      subCategory: item.subCategory || '',
      unit: item.unit || 'pcs',
      openingStock: displayStock.toString(),
      minStock: item.minStock ?? '',
      maxStock: item.maxStock ?? '',
      avgCostPrice: displayCost,
      salePrice: displaySale,
      manageStock: item.manageStock ?? true,
      isPosVisible: item.isPosVisible ?? true,
      isBoxEnabled: isBox,
      unitsPerBox: item.unitsPerBox ?? '8'
    });
    setEditingId(item.id);
    setShowFormModal(true);
  };

  const handleViewHistory = (item) => {
    navigate(`/inventory/stock-adjustment?itemId=${item.id}&search=${encodeURIComponent(item.name)}`);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await inventoryApi.delete(id);
      toast.success('Item deleted successfully!');
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Cannot delete item');
    }
  };

  const formatStockDisplay = (item) => {
    if (!item.manageStock) return <span className="text-gray-400 italic text-xs">Not Managed</span>;
    const totalUnits = Number(item.currentStock || 0);
    if (!item.isBoxEnabled || item.unitsPerBox <= 1) {
      return <span className="font-bold text-gray-800">{totalUnits} {item.unit}</span>;
    }
    const packs = Math.floor(totalUnits / item.unitsPerBox);
    const pcs = totalUnits % item.unitsPerBox;
    return (
      <div className="flex flex-col">
        <span className="font-bold text-gray-800">
          {packs} Pack{packs !== 1 ? 's' : ''} {pcs > 0 ? `& ${pcs} pcs` : ''}
        </span>
        <span className="text-xs text-gray-400 font-mono">Total Units: {totalUnits}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F2EB' }}>
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] text-white shadow-md">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Inventory Item Master & Valuation</h1>
              <p className="text-sm text-gray-600">
                Manage items & stock valuation for <span className="font-semibold text-[#A97A1F]">{currentBranch?.name || 'Selected Branch'}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => { 
              setEditingId(null); 
              setForm(initialFormState); 
              setShowFormModal(true); 
            }} 
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white font-semibold flex items-center gap-2 shadow-md hover:opacity-95 transition-all"
          >
            <Plus size={18} /> Add New Item
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-[#E0D8CC] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Filtered Items</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1 font-mono">{totalItemsCount}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-[#A97A1F]"><Package size={22} /></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#E0D8CC] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Stock Units</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1 font-mono">{totalStockUnits.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><TrendingUp size={22} /></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#E0D8CC] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Valuation</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1 font-mono">Rs {totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><DollarSign size={22} /></div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-[#E0D8CC] mb-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search by name or code..." 
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/30" 
            />
          </div>
          <div>
            <ReactSelect
  value={selectedCategory}
  onChange={(val) => setSelectedCategory(val || 'ALL')}
  options={[
    { value: 'ALL', label: 'All Categories' },
    ...categoriesList.map(cat => ({ value: cat.name, label: cat.name }))
  ]}
  placeholder="All Categories"
  isSearchable={true}
  isClearable={false}
/>
          </div>
          <div>
            <ReactSelect
  value={stockStatusFilter}
  onChange={(val) => setStockStatusFilter(val || 'ALL')}
  options={[
    { value: 'ALL', label: 'All Stock Statuses' },
    { value: 'NORMAL', label: 'Normal Stock' },
    { value: 'LOW', label: 'Low Stock Warning' },
    { value: 'OUT', label: 'Out of Stock (0)' }
  ]}
  placeholder="All Stock Statuses"
  isSearchable={false}
  isClearable={false}
/>
          </div>
        </div>

        {/* ADD / EDIT MODAL POPUP */}
        {showFormModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white p-6 rounded-3xl w-full max-w-2xl shadow-2xl border border-[#E0D8CC] max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <Tag size={18} className="text-[#A97A1F]" />
                  {editingId ? 'Edit Inventory Item' : 'Create New Inventory Item'}
                </h3>
                <button onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Item Name *</label>
                    <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Rice Supreme" className="w-full p-2.5 border border-gray-200 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Item Code / SKU</label>
                    <input value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="e.g. INV-001" className="w-full p-2.5 border border-gray-200 rounded-xl text-sm font-mono" />
                  </div>

                  {/* 📂 Dynamic Category Selection with Datalist (Supports Custom Entry) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Category * (Select or Type Custom)</label>
                    <input 
                      required 
                      list="inventory-category-list" 
                      value={form.category} 
                      onChange={e => setForm({...form, category: e.target.value})} 
                      placeholder="e.g. Grains, Beverage" 
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm bg-white" 
                    />
                    <datalist id="inventory-category-list">
                      {categoriesList.map((c) => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Sub Category</label>
                    <input list="subcategory-list" value={form.subCategory} onChange={e => setForm({...form, subCategory: e.target.value})} placeholder="e.g. Basmati" className="w-full p-2.5 border border-gray-200 rounded-xl text-sm" />
                    <datalist id="subcategory-list">{existingSubCategories.map((sc, i) => <option key={i} value={sc} />)}</datalist>
                  </div>

                  {/* ⚖️ Dynamic Unit Selection with Datalist (Supports Custom Entry) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Base Unit * (Select or Type Custom)</label>
                    <input 
                      required
                      list="inventory-unit-list" 
                      value={form.unit} 
                      onChange={e => setForm({...form, unit: e.target.value})} 
                      placeholder="e.g. kg, Thala, Bori, pcs" 
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm bg-white" 
                    />
                    <datalist id="inventory-unit-list">
                      {unitsList.map((u) => <option key={u.id} value={u.name} />)}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {form.isBoxEnabled ? 'Cost Price (Per Whole Box Rs)' : 'Cost Price (Per Unit Rs)'}
                    </label>
                    <input type="number" step="0.01" value={form.avgCostPrice} onChange={e => setForm({...form, avgCostPrice: e.target.value})} placeholder="0.00" className="w-full p-2.5 border border-gray-200 rounded-xl text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      {form.isBoxEnabled ? 'Sale Price (Per Whole Box Rs)' : 'Sale Price (Per Unit Rs)'}
                    </label>
                    <input type="number" step="0.01" value={form.salePrice} onChange={e => setForm({...form, salePrice: e.target.value})} placeholder="0.00" className="w-full p-2.5 border border-gray-200 rounded-xl text-sm font-mono" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Min Stock Warning Level</label>
                    <input type="number" step="0.001" value={form.minStock} onChange={e => setForm({...form, minStock: e.target.value})} placeholder="0" className="w-full p-2.5 border border-gray-200 rounded-xl text-sm" />
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
                    <input type="checkbox" checked={form.manageStock} onChange={e => setForm({...form, manageStock: e.target.checked})} className="w-4 h-4 rounded text-[#A97A1F]" />
                    <span className="text-xs font-bold text-gray-700">Manage Stock Levels</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
                    <input type="checkbox" checked={form.isPosVisible} onChange={e => setForm({...form, isPosVisible: e.target.checked})} className="w-4 h-4 rounded text-[#A97A1F]" />
                    <span className="text-xs font-bold text-gray-700">Show in POS Sale Screen</span>
                  </label>
                </div>

                {/* Box Conversion Checkbox */}
                {form.manageStock && (
                  <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isBoxEnabled} onChange={e => setForm({...form, isBoxEnabled: e.target.checked})} className="w-4 h-4 rounded text-[#A97A1F]" />
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5"><Box size={15} /> Save stock in Cartons / Thalas (Auto-convert to units)</span>
                    </label>

                    {form.isBoxEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Units per Pack / Thala (e.g. 50)</label>
                          <input type="number" value={form.unitsPerBox} onChange={e => setForm({...form, unitsPerBox: e.target.value})} placeholder="50" className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-sm font-mono" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Opening Stock in Thalas (e.g. 5 thalas)</label>
                          <input type="number" step="0.001" value={form.openingStock} onChange={e => setForm({...form, openingStock: e.target.value})} placeholder="e.g. 5" className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-sm font-mono font-bold text-[#A97A1F]" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!form.isBoxEnabled && form.manageStock && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {editingId ? 'Stock Adjust / Current Stock' : 'Opening Stock'}
                    </label>
                    <input type="number" step="0.001" value={form.openingStock} onChange={e => setForm({...form, openingStock: e.target.value})} placeholder="0.00" className="w-full p-2.5 border border-gray-200 rounded-xl text-sm font-mono" />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3">
                  <button type="button" onClick={() => setShowFormModal(false)} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm">Cancel</button>
                  <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white font-semibold rounded-xl shadow-md text-sm">
                    {editingId ? 'Update Item' : 'Save Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-[#E0D8CC] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F2EB] border-b border-[#E0D8CC] text-gray-700 font-semibold">
                <tr>
                  <th className="p-4">Item Details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4 text-center">Current Stock</th>
                  <th className="p-4 text-right">Cost Price</th>
                  <th className="p-4 text-right">Sale Price</th>
                  <th className="p-4 text-right">Valuation</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedItemList.length > 0 ? (
                  paginatedItemList.map(item => {
                    const stock = Number(item.currentStock || 0);
                    const cost = Number(item.avgCostPrice || 0);
                    const valuation = stock * cost;

                    return (
                      <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-gray-800">{item.name}</div>
                          <div className="text-xs text-gray-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <span>{item.code || 'No Code'}</span> • <span>{item.unit}</span>
                            {item.isBoxEnabled && <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold">1 Pack = {item.unitsPerBox} units</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-amber-50 text-[#A97A1F] rounded-lg text-xs font-medium border border-amber-200">
                            {item.category}
                          </span>
                          {item.subCategory && <div className="text-xs text-gray-400 mt-1">{item.subCategory}</div>}
                        </td>
                        <td className="p-4 text-center">
                          {formatStockDisplay(item)}
                        </td>
                        <td className="p-4 text-right text-gray-700 font-mono">Rs {cost.toLocaleString()}</td>
                        <td className="p-4 text-right text-emerald-700 font-mono font-semibold">Rs {Number(item.salePrice || 0).toLocaleString()}</td>
                        <td className="p-4 text-right text-gray-900 font-mono font-bold">Rs {valuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleViewHistory(item)} title="View Transaction History" className="p-2 hover:bg-amber-100 rounded-xl text-[#A97A1F]">
                              <History size={15} />
                            </button>
                            <button onClick={() => handleEdit(item)} title="Edit" className="p-2 hover:bg-blue-100 rounded-xl text-blue-600">
                              <Edit2 size={15} />
                            </button>
                            <button onClick={() => handleDelete(item.id)} title="Delete" className="p-2 hover:bg-red-100 rounded-xl text-red-600">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-400">No matching inventory items found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalItemsCount > 0 && (
            <div className="px-6 py-4 bg-[#F5F2EB]/50 border-t border-[#E0D8CC] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-600 font-medium">
                Showing <span className="font-bold text-gray-800">{startIndex + 1}</span> to{' '}
                <span className="font-bold text-gray-800">{Math.min(startIndex + itemsPerPage, totalItemsCount)}</span> of{' '}
                <span className="font-bold text-gray-800">{totalItemsCount}</span> entries
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 text-xs font-bold rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-[#A97A1F] text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}