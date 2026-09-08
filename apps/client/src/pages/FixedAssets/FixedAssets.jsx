import React, { useState, useMemo } from 'react';
import { 
  Package, Plus, Search, Edit2, Trash2, X, Tag, 
  Building2, ShieldAlert, DollarSign, TrendingUp 
} from 'lucide-react';
import assetApi from '../../services/assetApi';
import categoryApi from '../../services/categoryApi';
import unitApi from '../../services/unitApi';
import authApi from '../../services/authApi';
import ReactSelect from '../../components/ui/ReactSelect';
import { useBranch } from '../../context/BranchContext';
import useGlobalData from '../../hooks/useGlobalData';
import toast from 'react-hot-toast';

// ── Modal Component ──
const AssetFormModal = ({ isOpen, onClose, editingId, form, setForm, onSubmit, categoriesList, unitsList, branchFormOptions, conditionFormOptions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-300">
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex justify-between items-center rounded-t-2xl">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
            <Tag size={18} className="text-[#2563EB]" />
            {editingId ? 'Edit Fixed Asset' : 'Register New Fixed Asset'}
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={22} />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Asset Name *</label>
              <input 
                required 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                placeholder="e.g. Dining Chair" 
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Asset Code / Tag</label>
              <input 
                value={form.code} 
                onChange={e => setForm({...form, code: e.target.value})} 
                placeholder="e.g. CHAIR-01" 
                className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all" 
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Category *</label>
              <input 
                required 
                list="asset-category-list"
                value={form.category} 
                onChange={e => setForm({...form, category: e.target.value})} 
                placeholder="Type or select category" 
                className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all" 
              />
              <datalist id="asset-category-list">
                {categoriesList.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Unit *</label>
              <input 
                required
                list="asset-unit-list"
                value={form.unit} 
                onChange={e => setForm({...form, unit: e.target.value})} 
                placeholder="Type or select unit" 
                className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all" 
              />
              <datalist id="asset-unit-list">
                {unitsList.map(u => <option key={u.id} value={u.name} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Condition *</label>
              <ReactSelect
                options={conditionFormOptions}
                value={conditionFormOptions.find(opt => opt.value === form.condition) || null}
                onChange={opt => setForm({...form, condition: opt?.value || 'GOOD'})}
                placeholder="Select Condition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Quantity *</label>
              <input 
                type="number" 
                min="1"
                required 
                value={form.quantity} 
                onChange={e => setForm({...form, quantity: e.target.value})} 
                placeholder="1" 
                className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all" 
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Unit Cost Price (Rs) *</label>
              <input 
                type="number" 
                step="0.01" 
                min="0"
                required 
                value={form.costPrice} 
                onChange={e => setForm({...form, costPrice: e.target.value})} 
                placeholder="0.00" 
                className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all" 
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Allocate Branch *</label>
              <ReactSelect
                options={branchFormOptions}
                value={branchFormOptions.find(opt => opt.value === String(form.branchId)) || null}
                onChange={opt => setForm({...form, branchId: opt?.value || ''})}
                placeholder="-- Select Branch --"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes / Remarks</label>
              <input 
                value={form.notes} 
                onChange={e => setForm({...form, notes: e.target.value})} 
                placeholder="Optional remarks..." 
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all" 
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-6 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white font-semibold rounded-xl shadow-md text-sm hover:opacity-95 transition-all"
            >
              {editingId ? 'Update Asset' : 'Save Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function FixedAssets() {
  const { currentBranch } = useBranch();
  const [search, setSearch] = useState('');
  const [conditionFilter, setConditionFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialFormState = {
    name: '',
    code: '',
    category: '',
    unit: 'pcs',
    condition: 'GOOD',
    quantity: '',
    costPrice: '',
    branchId: currentBranch?.id || '',
    notes: ''
  };

  const [form, setForm] = useState(initialFormState);

  // ── Fetch Assets, Asset Categories & Asset Units ──
  const { data: fetchResult, refetch } = useGlobalData(
    async () => {
      const activeBranchId = currentBranch?.id;

      const [assetsRes, catRes, unitRes] = await Promise.all([
        assetApi.getAll({ search, condition: conditionFilter, branch: activeBranchId }),
        categoryApi.getAll({ scope: 'ASSET', branchId: activeBranchId }),
        unitApi.getAll({ scope: 'ASSET', branchId: activeBranchId })
      ]);

      let assetsData = [];
      if (Array.isArray(assetsRes)) assetsData = assetsRes;
      else if (Array.isArray(assetsRes?.data)) assetsData = assetsRes.data;
      else if (Array.isArray(assetsRes?.assets)) assetsData = assetsRes.assets;

      const categoriesData = catRes?.data || catRes || [];
      const unitsData = unitRes?.data || unitRes || [];

      return { assets: assetsData, categories: categoriesData, units: unitsData };
    },
    { dependencies: [search, conditionFilter, currentBranch] }
  );

  // Fetch Branches for allocation dropdown
  const { data: branchesData } = useGlobalData(async () => {
    const res = await authApi.getBranches();
    return res?.branches || res?.data || [];
  });

  const assetList = Array.isArray(fetchResult?.assets) ? fetchResult.assets : [];
  const categoriesList = Array.isArray(fetchResult?.categories) ? fetchResult.categories : [];
  const unitsList = Array.isArray(fetchResult?.units) ? fetchResult.units : [];
  const branchArray = Array.isArray(branchesData) ? branchesData : (branchesData?.branches || []);

  // ── ReactSelect Options ──
  const conditionFilterOptions = useMemo(() => [
    { value: 'ALL', label: ' All Asset Conditions' },
    { value: 'GOOD', label: ' Good Condition' },
    { value: 'DAMAGED', label: ' Damaged' },
    { value: 'UNDER_MAINTENANCE', label: ' Under Maintenance' },
    { value: 'DISPOSED', label: ' Disposed' }
  ], []);

  const conditionFormOptions = useMemo(() => [
    { value: 'GOOD', label: 'Good' },
    { value: 'DAMAGED', label: 'Damaged' },
    { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
    { value: 'DISPOSED', label: 'Disposed' }
  ], []);

  const branchFormOptions = useMemo(() => [
    { value: '', label: '-- Select Branch --' },
    ...branchArray.map(b => ({ value: String(b.id), label: b.name }))
  ], [branchArray]);

  // 📊 Analytics Metrics Cards Calculation
  const totalAssetsCount = assetList.length;
  const totalQuantityUnits = assetList.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalValuation = assetList.reduce((sum, item) => sum + Number(item.totalValuation || 0), 0);
  const damagedCount = assetList.filter(item => item.condition === 'DAMAGED').length;

  // ── Modal Open/Close Handlers ──
  const openAddModal = () => {
    setEditingId(null);
    setForm(initialFormState);
    setShowForm(true);
  };

  const openEditModal = (asset) => {
    setForm({
      name: asset.name,
      code: asset.code || '',
      category: asset.category || '',
      unit: asset.unit || 'pcs',
      condition: asset.condition || 'GOOD',
      quantity: asset.quantity || 1,
      costPrice: asset.costPrice || 0,
      branchId: asset.branchId || currentBranch?.id || '',
      notes: asset.notes || ''
    });
    setEditingId(asset.id);
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(initialFormState);
  };

  // ── Handle Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const activeBranchId = currentBranch?.id || 1;

      // ✅ 1. Check & Auto-Create Asset Category if new
      if (form.category) {
        const trimmedCat = form.category.trim();
        const foundCat = categoriesList.find(c => c.name.toLowerCase() === trimmedCat.toLowerCase());
        if (!foundCat) {
          try {
            await categoryApi.create({
              name: trimmedCat,
              scope: 'ASSET',
              branchId: activeBranchId
            });
          } catch (catErr) {
            console.log('Category create handle', catErr);
          }
        }
      }

      // ✅ 2. Check & Auto-Create Asset Unit if new
      if (form.unit) {
        const trimmedUnit = form.unit.trim();
        const foundUnit = unitsList.find(u => u.name.toLowerCase() === trimmedUnit.toLowerCase());
        if (!foundUnit) {
          try {
            await unitApi.create({
              name: trimmedUnit,
              symbol: trimmedUnit.substring(0, 3).toLowerCase(),
              type: 'BOTH',
              scope: 'ASSET',
              branchId: activeBranchId
            });
          } catch (unitErr) {
            console.log('Unit create handle', unitErr);
          }
        }
      }

      const payload = {
        ...form,
        category: form.category.trim(),
        unit: form.unit.trim(),
        quantity: parseInt(form.quantity) || 1,
        costPrice: parseFloat(form.costPrice) || 0,
        branchId: form.branchId ? Number(form.branchId) : activeBranchId
      };

      if (editingId) {
        await assetApi.update(editingId, payload);
        toast.success('Asset updated successfully!');
      } else {
        await assetApi.create(payload);
        toast.success('Asset registered successfully!');
      }

      closeModal();
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save asset');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    try {
      await assetApi.delete(id);
      toast.success('Asset deleted successfully!');
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    }
  };

  const getConditionBadge = (cond) => {
    switch (cond) {
      case 'GOOD':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">✅ Good</span>;
      case 'DAMAGED':
        return <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold border border-red-200">❌ Damaged</span>;
      case 'UNDER_MAINTENANCE':
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200">🔧 Maintenance</span>;
      default:
        return <span className="px-2.5 py-1 bg-gray-50 text-gray-700 rounded-lg text-xs font-bold border border-gray-200">🗑️ Disposed</span>;
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] text-white shadow-md">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Fixed Assets Management</h1>
              <p className="text-sm text-gray-600">
                Track non-saleable assets (Chairs, Sofas, Plates, etc.) for <span className="font-semibold text-[#2563EB]">{currentBranch?.name || 'All Branches'}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={openAddModal} 
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white font-semibold flex items-center gap-2 shadow-md hover:opacity-95 transition-all"
          >
            <Plus size={18} /> Add New Asset
          </button>
        </div>

        {/* 📈 Analytics Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Asset Items</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1 font-mono">{totalAssetsCount}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-[#2563EB]">
              <Package size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Units Available</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1 font-mono">{totalQuantityUnits.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <TrendingUp size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Damaged / Maint.</p>
              <h3 className="text-2xl font-bold text-red-600 mt-1 font-mono">{damagedCount}</h3>
            </div>
            <div className="p-3 bg-red-50 rounded-xl text-red-600">
              <ShieldAlert size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Asset Valuation</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1 font-mono">Rs {totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-300 mb-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search assets by name, code, or category..." 
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30" 
            />
          </div>
          <div>
            <ReactSelect
              options={conditionFilterOptions}
              value={conditionFilterOptions.find(opt => opt.value === conditionFilter) || null}
              onChange={opt => setConditionFilter(opt?.value || 'ALL')}
              placeholder="All Asset Conditions"
            />
          </div>
        </div>

        {/* ── Modal ── */}
        <AssetFormModal
          isOpen={showForm}
          onClose={closeModal}
          editingId={editingId}
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          categoriesList={categoriesList}
          unitsList={unitsList}
          branchFormOptions={branchFormOptions}
          conditionFormOptions={conditionFormOptions}
        />

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-slate-300 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F1F5F9] border-b border-slate-300 text-gray-700 font-semibold">
                <tr>
                  <th className="p-4">Asset Details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Assigned Branch</th>
                  <th className="p-4 text-center">Condition</th>
                  <th className="p-4 text-center">Quantity</th>
                  <th className="p-4 text-right">Total Valuation</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assetList.length > 0 ? (
                  assetList.map(asset => (
                    <tr key={asset.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-gray-800">{asset.name}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{asset.code || 'No Code/Tag'} • {asset.unit || 'pcs'}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-amber-50 text-[#2563EB] rounded-lg text-xs font-medium border border-amber-200">
                          {asset.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1.5 font-medium text-gray-800">
                          <Building2 size={14} className="text-[#2563EB]" />
                          {asset.branch?.name || 'Main Branch'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {getConditionBadge(asset.condition)}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-gray-800">
                        {asset.quantity} {asset.unit || ''}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-700">
                        Rs {Number(asset.totalValuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => openEditModal(asset)} title="Edit" className="p-2 hover:bg-amber-100 rounded-xl text-gray-600 transition-colors">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(asset.id)} title="Delete" className="p-2 hover:bg-red-100 rounded-xl text-red-600 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-400">
                      No fixed assets found. Click "Add New Asset" to register one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}