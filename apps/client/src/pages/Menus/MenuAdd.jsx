import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus, Trash2, Save, X, Search, ChevronLeft, ChevronRight,
  Check, Utensils, Box, Edit2, Eye, Layers, AlertCircle, LayoutGrid, Table as TableIcon
} from 'lucide-react';

import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ReactSelect from '../../components/ui/ReactSelect';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import menuApi from '../../services/menuApi';
import categoryApi from '../../services/categoryApi';
import itemApi from '../../services/itemApi';
import unitApi from '../../services/unitApi';
import { useBranch } from '../../context/BranchContext';

// ==================== TOAST SYSTEM ====================
const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id}
          className="flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-bold min-w-[280px]"
          style={{
            background: t.type === 'success' 
              ? 'linear-gradient(135deg, #1B5E20, #2E7D32)' 
              : 'linear-gradient(135deg, #B71C1C, #D32F2F)',
            animation: 'slideIn 0.3s ease-out'
          }}>
          {t.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-auto opacity-70 hover:opacity-100"><X size={14} /></button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );

  return { addToast, ToastContainer };
};

const DEFAULT_ITEM = {
  itemId: null,
  name: '',
  code: '',
  description: '',
  unit: 'plate',
  costPrice: '',
  salePrice: '',
  quantityPerHead: '1',
  isBulkUnit: false,
  conversionRate: '1',
  subUnitName: 'plate',
  isActive: true
};

const DEFAULT_CATEGORY = {
  name: '',
  sortOrder: 0,
  items: []
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' }
];

export default function MenuManagement() {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  const { addToast, ToastContainer } = useToast();

  // List view states
  const [menus, setMenus] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // View Toggle State ('grid' or 'table')
  const [viewMode, setViewMode] = useState('grid');

  // Master Data
  const [masterCategories, setMasterCategories] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [masterUnits, setMasterUnits] = useState([]);

  // Category-wise item selection filter state per Category Index
  // Format: { [catIndex]: selectedCategoryId }
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState({});

  // Modal states for Add / Edit / View
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedMenuId, setSelectedMenuId] = useState(null);

  // Form states
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);

  const [showItemModal, setShowItemModal] = useState(false);
  const [modalCatIndex, setModalCatIndex] = useState(null);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [itemForm, setItemForm] = useState(DEFAULT_ITEM);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'active',
    categories: [{ ...DEFAULT_CATEGORY, name: 'Main Course' }],
  });

  const [errors, setErrors] = useState({});

  // Fetch menus
  const fetchMenus = useCallback(async () => {
    try {
      setListLoading(true);
      const branchId = currentBranch?.id || 1;
      const res = await menuApi.getAll({ branchId });
      setMenus(res?.data || res || []);
    } catch (e) {
      console.error('Failed to fetch menus:', e);
      addToast('Menus load nahi ho sakay!', 'error');
    } finally {
      setListLoading(false);
    }
  }, [currentBranch?.id]);

  useEffect(() => {
    fetchMenus();
    const fetchMasterData = async () => {
      try {
        const branchId = currentBranch?.id || 1;
        const [catRes, itemRes, unitRes] = await Promise.all([
          categoryApi.getAll({ scope: 'MENU', isActive: 'true', branchId }),
          itemApi.getAll({ isActive: 'true', branchId }),
          unitApi.getAll({ scope: 'MENU', branchId })
        ]);
        setMasterCategories(catRes?.data || catRes || []);
        setMasterItems(itemRes?.data || itemRes || []);
        setMasterUnits(unitRes?.data || unitRes || []);
      } catch (e) {
        console.error('Failed to load master data:', e);
      }
    };
    fetchMasterData();
  }, [currentBranch?.id]);

  // Open Modal
  const handleOpenModal = async (mode, menuId = null) => {
    setModalMode(mode);
    setSelectedMenuId(menuId);
    setSelectedCategoryFilter({});
    setErrors({});

    if (mode === 'create') {
      setFormData({
        name: '',
        code: '',
        description: '',
        status: 'active',
        categories: [{ ...DEFAULT_CATEGORY, name: 'Main Course' }],
      });
      setIsModalOpen(true);
    } else if (menuId) {
      try {
        setPageLoading(true);
        setIsModalOpen(true);
        const branchId = currentBranch?.id || 1;
        const res = await menuApi.getById(menuId, { branchId });
        const menu = res?.data;

        if (menu) {
          setFormData({
            name: menu.name || '',
            code: menu.code || '',
            description: menu.description || '',
            status: menu.status || 'active',
            categories: menu.categories?.length > 0
              ? menu.categories.map((cat, idx) => ({
                  name: cat.name || '',
                  sortOrder: cat.sortOrder ?? idx,
                  items: cat.items?.map(item => ({
                    itemId: item.itemId || null,
                    name: item.name || '',
                    code: item.code || '',
                    description: item.description || '',
                    unit: item.unit || 'plate',
                    costPrice: item.costPrice?.toString() || '',
                    salePrice: item.salePrice?.toString() || '',
                    quantityPerHead: item.quantityPerHead?.toString() || '1',
                    isBulkUnit: item.isBulkUnit ?? false,
                    conversionRate: item.conversionRate?.toString() || '1',
                    subUnitName: item.subUnitName || 'plate',
                    isActive: item.isActive !== undefined ? item.isActive : true
                  })) || []
                }))
              : [{ ...DEFAULT_CATEGORY, name: 'Main Course' }]
          });
        }
      } catch (e) {
        console.error('Failed to load menu details:', e);
        addToast('Menu details load nahi ho saki!', 'error');
        setIsModalOpen(false);
      } finally {
        setPageLoading(false);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMenuId(null);
  };

  const calculateTotals = useCallback(() => {
    let totalCost = 0, totalSale = 0, itemCount = 0;
    formData.categories.forEach(cat => {
      cat.items.forEach(item => {
        const cost = parseFloat(item.costPrice) || 0;
        const sale = parseFloat(item.salePrice) || 0;
        const qty = parseFloat(item.quantityPerHead) || 1;
        totalCost += cost * qty;
        totalSale += sale * qty;
        itemCount++;
      });
    });
    const profit = totalSale > 0 ? ((totalSale - totalCost) / totalSale * 100) : 0;
    return { totalCost, totalSale, profit, itemCount };
  }, [formData]);

  const totals = calculateTotals();

  const handleBasicChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name?.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Menu name is required (min 2 chars)';
    }

    const updatedCategories = formData.categories.map((cat, idx) => ({
      ...cat,
      name: cat.name?.trim() || `Category ${idx + 1}`
    }));

    setFormData(prev => ({ ...prev, categories: updatedCategories }));
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addCategory = () => {
    setFormData(prev => ({
      ...prev,
      categories: [...prev.categories, { ...DEFAULT_CATEGORY, name: '', sortOrder: prev.categories.length }]
    }));
  };

  const removeCategory = (catIndex) => {
    if (formData.categories.length <= 1) {
      addToast('At least one category is required', 'error');
      return;
    }
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== catIndex)
    }));
  };

  const updateCategory = (catIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) => i === catIndex ? { ...cat, [field]: value } : cat)
    }));
  };

  const openItemModal = (catIndex, item = null, itemIdx = null) => {
    setModalCatIndex(catIndex);
    if (item) {
      setEditingItemIndex(itemIdx);
      setItemForm({ ...item });
    } else {
      setEditingItemIndex(null);
      setItemForm(DEFAULT_ITEM);
    }
    setShowItemModal(true);
  };

  const handleItemSubmit = (e) => {
    e.preventDefault();
    if (!itemForm.name?.trim()) {
      addToast('Item name is required', 'error');
      return;
    }

    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) => {
        if (i !== modalCatIndex) return cat;
        const updatedItems = [...cat.items];
        if (editingItemIndex !== null) {
          updatedItems[editingItemIndex] = itemForm;
        } else {
          updatedItems.push(itemForm);
        }
        return { ...cat, items: updatedItems };
      })
    }));

    setShowItemModal(false);
    addToast(editingItemIndex !== null ? 'Item updated!' : 'Item added to menu!', 'success');
  };

  const addItemFromMaster = (catIndex, masterItem) => {
    const isBulk = masterItem.isBulkUnit === true || (masterItem.unit && masterItem.unit.toLowerCase().includes('degh'));
    const conversionRate = parseFloat(masterItem.conversionRate) || 50;

    let finalCost = parseFloat(masterItem.costPrice) || 0;
    let finalSale = parseFloat(masterItem.salePrice) || 0;
    let finalUnit = 'plate';

    if (isBulk && conversionRate > 0) {
      finalCost = finalCost / conversionRate;
      finalSale = finalSale / conversionRate;
      finalUnit = masterItem.subUnitName || 'plate';
    } else {
      finalUnit = masterItem.unit || 'plate';
    }

    const newItem = {
      itemId: masterItem.id,
      name: masterItem.name,
      code: masterItem.code || '',
      unit: finalUnit,
      costPrice: finalCost.toFixed(2),
      salePrice: finalSale.toFixed(2),
      quantityPerHead: '1',
      isBulkUnit: false,
      conversionRate: '1',
      subUnitName: finalUnit,
      description: masterItem.description || ''
    };

    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) => i === catIndex ? { 
        ...cat, 
        items: [...cat.items, newItem] 
      } : cat)
    }));
    addToast(`Added "${masterItem.name}"`, 'success');
  };

  const removeItem = (catIndex, itemIndex) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) => i === catIndex ? { ...cat, items: cat.items.filter((_, j) => j !== itemIndex) } : cat)
    }));
  };

  const handleSave = async () => {
    if (!validateForm()) {
      addToast('Please fix errors before saving', 'error');
      return;
    }
    setLoading(true);
    try {
      const branchId = currentBranch?.id || 1;
      const payload = {
        name: formData.name.trim(),
        code: formData.code?.trim() || null,
        description: formData.description || null,
        status: formData.status,
        guestCount: 1,
        branchId,
        categories: formData.categories.map(cat => ({
          name: cat.name.trim(),
          sortOrder: cat.sortOrder,
          items: cat.items.map(item => ({
            itemId: item.itemId,
            name: item.name.trim(),
            code: item.code?.trim() || null,
            description: item.description || null,
            unit: item.unit || 'plate',
            costPrice: parseFloat(item.costPrice) || 0,
            salePrice: parseFloat(item.salePrice) || 0,
            quantityPerHead: parseFloat(item.quantityPerHead) || 1,
            isBulkUnit: Boolean(item.isBulkUnit),
            conversionRate: parseFloat(item.conversionRate) || 1,
            subUnitName: item.subUnitName?.trim() || 'plate',
            isActive: true
          }))
        }))
      };

      if (modalMode === 'edit') {
        await menuApi.update(selectedMenuId, payload);
        addToast('✨ Menu updated successfully!', 'success');
      } else {
        await menuApi.create(payload);
        addToast('✨ Menu created successfully!', 'success');
      }

      handleCloseModal();
      fetchMenus();
    } catch (err) {
      console.error('❌ ERROR:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to save menu';
      addToast(msg, 'error');
    }  {
      setLoading(false);
    }
  };

  const handleDeleteMenu = async (id) => {
    if (!window.confirm('Are you sure you want to delete this menu?')) return;
    try {
      const branchId = currentBranch?.id || 1;
      await menuApi.delete(id, { branchId });
      addToast('Menu deleted successfully', 'success');
      fetchMenus();
    } catch (e) {
      console.error('Failed to delete menu:', e);
      addToast('Failed to delete menu', 'error');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(value);
  };

  // Filtered & Paginated Menus
  const filteredMenus = useMemo(() => {
    return menus.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (m.code && m.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [menus, searchTerm]);

  const totalPages = Math.ceil(filteredMenus.length / itemsPerPage) || 1;
  
  const paginatedMenus = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMenus.slice(start, start + itemsPerPage);
  }, [filteredMenus, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="min-h-screen pb-12 relative" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      <ToastContainer />

      {/* TOP HEADER */}
      <div className="border-b backdrop-blur-xl bg-white/90 sticky top-0 z-30 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#2563EB] shadow-md">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Menu Management</h1>
              <p className="text-xs font-medium text-gray-500">
                Create, edit & manage menus
                {currentBranch && <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-amber-100/80 text-[#8B6914] font-bold">📍 {currentBranch.name}</span>}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-xl border border-slate-300 flex items-center shadow-sm">
              <button 
                onClick={() => setViewMode('grid')} 
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#2563EB] text-white' : 'text-gray-400'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('table')} 
                className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[#2563EB] text-white' : 'text-gray-400'}`}
              >
                <TableIcon size={18} />
              </button>
            </div>

            <Button onClick={() => handleOpenModal('create')} className="bg-gradient-to-r from-[#2563EB] to-[#2563EB] text-white rounded-xl shadow-md">
              <Plus size={16} /> Add Menu
            </Button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT / LIST */}
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search menus by name or code..." 
              value={searchTerm} 
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }} 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
        </div>

        {listLoading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-t-[#2563EB] animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
            <p className="mt-4 text-sm font-bold text-gray-600">Loading menus...</p>
          </div>
        ) : paginatedMenus.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-300 p-12 text-center shadow-sm">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-700">No Menus Found</h3>
            <p className="text-xs text-gray-500 mt-1">Get started by creating your first menu template.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedMenus.map(menu => (
              <div key={menu.id} className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-[#2563EB] border border-amber-200">
                        {menu.code || 'MENU'}
                      </span>
                      <h3 className="font-bold text-base text-gray-800 mt-1">{menu.name}</h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${menu.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {menu.status || 'active'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4">{menu.description || 'No description provided.'}</p>
                </div>

                <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleOpenModal('view', menu.id)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600"><Eye size={16} /></button>
                    <button onClick={() => handleOpenModal('edit', menu.id)} className="p-2 rounded-xl hover:bg-amber-50 text-[#2563EB]"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteMenu(menu.id)} className="p-2 rounded-xl hover:bg-red-50 text-red-600"><Trash2 size={16} /></button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleOpenModal('view', menu.id)} className="border-slate-300 text-xs">
                    View Items
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300 text-xs font-bold text-gray-600 uppercase">
                  <th className="py-3.5 px-4">Menu Name</th>
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {paginatedMenus.map(menu => (
                  <tr key={menu.id} className="hover:bg-amber-50/30">
                    <td className="py-3.5 px-4 font-bold text-gray-900">{menu.name}</td>
                    <td className="py-3.5 px-4"><span className="text-xs font-bold text-[#2563EB]">{menu.code || 'MENU'}</span></td>
                    <td className="py-3.5 px-4 text-xs text-gray-500 max-w-xs truncate">{menu.description || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${menu.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {menu.status || 'active'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleOpenModal('view', menu.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><Eye size={15} /></button>
                        <button onClick={() => handleOpenModal('edit', menu.id)} className="p-1.5 rounded-lg hover:bg-amber-50 text-[#2563EB]"><Edit2 size={15} /></button>
                        <button onClick={() => handleDeleteMenu(menu.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-300 shadow-sm">
            <span className="text-xs text-gray-500">
              Showing Page <strong className="text-gray-800">{currentPage}</strong> of <strong className="text-gray-800">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handlePageChange(currentPage - 1)} 
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-300 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => handlePageChange(currentPage + 1)} 
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-300 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* OVERLAY MODAL FOR CREATE / EDIT / VIEW */}
      {isModalOpen && (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 border-b bg-slate-50 flex items-center justify-between border-slate-300 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-[#2563EB]">
                  <Utensils size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg text-gray-800">
                    {modalMode === 'create' && 'Create New Menu'}
                    {modalMode === 'edit' && 'Edit Menu Template'}
                    {modalMode === 'view' && 'View Menu Details'}
                  </h2>
                </div>
              </div>
              <button onClick={handleCloseModal} className="p-2 rounded-xl hover:bg-gray-200 text-gray-600"><X size={20} /></button>
            </div>

            {/* Modal Body */}
            <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {pageLoading ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-full border-4 border-t-[#2563EB] animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#2563EB' }} />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  
                  {/* Left Form */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-xl border border-slate-300 p-4 shadow-sm space-y-4">
                      <h3 className="font-bold text-xs text-gray-700 uppercase">Basic Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="text-xs font-bold mb-1 block text-gray-600">Menu Name *</label>
                          <Input disabled={modalMode === 'view'} value={formData.name} onChange={(e) => handleBasicChange('name', e.target.value)} placeholder="e.g., Standard Wedding Menu" />
                          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>
                        <div>
                          <label className="text-xs font-bold mb-1 block text-gray-600">Menu Code</label>
                          <Input disabled={modalMode === 'view'} value={formData.code} onChange={(e) => handleBasicChange('code', e.target.value)} placeholder="MENU-001" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold mb-1 block text-gray-600">Status</label>
                        <ReactSelect isDisabled={modalMode === 'view'} value={formData.status} onChange={(val) => handleBasicChange('status', val)} options={STATUS_OPTIONS} />
                      </div>
                    </div>

                    {/* Categories & Dishes */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-xs text-gray-700 uppercase">Categories & Dishes</h3>
                        {modalMode !== 'view' && (
                          <Button variant="outline" size="sm" onClick={addCategory} className="border-slate-300 text-[#2563EB]">
                            <Plus size={14} /> Add Category
                          </Button>
                        )}
                      </div>

                      <div className="space-y-4">
                        {formData.categories.map((category, catIndex) => {
                          
                          // Items Filtered by Selected Category dropdown
                          const catFilterId = selectedCategoryFilter[catIndex];
                          const availableMasterItems = catFilterId
                            ? masterItems.filter(item => String(item.categoryId) === String(catFilterId))
                            : masterItems;

                          return (
                            <div key={catIndex} className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-sm">
                              <div className="px-4 py-2.5 flex items-center gap-3 border-b bg-slate-50" style={{ borderColor: '#CBD5E1' }}>
                                <input 
                                  disabled={modalMode === 'view'} 
                                  value={category.name || ''} 
                                  onChange={(e) => updateCategory(catIndex, 'name', e.target.value)} 
                                  placeholder="e.g., Main Course" 
                                  className="bg-transparent font-bold text-sm w-full focus:outline-none text-gray-800" 
                                />
                                {modalMode !== 'view' && formData.categories.length > 1 && (
                                  <button onClick={() => removeCategory(catIndex)} className="p-1 hover:bg-red-50 rounded text-red-600">
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>

                              <div className="p-4 space-y-4">
                                {modalMode !== 'view' && (
                                  <div className="bg-[#FBF9F5] p-3 rounded-xl border border-slate-300 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-[#2563EB]">⚡ Select Items from Master</span>
                                      <Button variant="outline" size="sm" onClick={() => openItemModal(catIndex)} className="border-slate-300 text-xs">
                                        <Plus size={12} /> Custom Dish
                                      </Button>
                                    </div>

                                    {/* 2-STEP CASCADING SEARCHABLE DROPDOWNS */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      
                                      {/* STEP 1: CATEGORY SELECTION */}
                                      <ReactSelect
                                        value={selectedCategoryFilter[catIndex] || ''}
                                        onChange={(catId) => {
                                          setSelectedCategoryFilter(prev => ({ ...prev, [catIndex]: catId }));
                                        }}
                                        options={[
                                          { value: '', label: '🔍 Filter by Category...' },
                                          ...masterCategories.map(mc => ({ value: String(mc.id), label: mc.name }))
                                        ]}
                                        placeholder="1. Select Category"
                                        isSearchable={true}
                                      />

                                      {/* STEP 2: ITEM SELECTION (DEPENDENT ON STEP 1) */}
                                      <ReactSelect
                                        value=""
                                        onChange={(itemId) => {
                                          if (!itemId) return;
                                          const mItem = masterItems.find(mi => String(mi.id) === String(itemId));
                                          if (mItem) addItemFromMaster(catIndex, mItem);
                                        }}
                                        options={[
                                          { value: '', label: '🍽️ Select Dish / Item...' },
                                          ...availableMasterItems.map(mi => ({
                                            value: String(mi.id),
                                            label: `${mi.name} (Rs ${mi.salePrice})`
                                          }))
                                        ]}
                                        placeholder="2. Pick Item"
                                        isSearchable={true}
                                      />

                                    </div>
                                  </div>
                                )}

                                {category.items.length > 0 ? (
                                  <div className="overflow-x-auto rounded-xl border border-slate-300">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-slate-300">
                                          <th className="text-left px-3 py-2 font-bold">Dish Name</th>
                                          <th className="text-left px-3 py-2 font-bold">Unit</th>
                                          <th className="text-right px-3 py-2 font-bold">Cost</th>
                                          <th className="text-right px-3 py-2 font-bold">Sale</th>
                                          <th className="text-center px-3 py-2 font-bold">Qty</th>
                                          {modalMode !== 'view' && <th className="text-center px-3 py-2 font-bold">Actions</th>}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {category.items.map((item, itemIndex) => (
                                          <tr key={itemIndex}>
                                            <td className="px-3 py-2 font-medium">{item.name}</td>
                                            <td className="px-3 py-2 text-gray-500">{item.unit}</td>
                                            <td className="px-3 py-2 text-right">Rs {item.costPrice}</td>
                                            <td className="px-3 py-2 text-right font-bold text-gray-800">Rs {item.salePrice}</td>
                                            <td className="px-3 py-2 text-center">{item.quantityPerHead}</td>
                                            {modalMode !== 'view' && (
                                              <td className="px-3 py-2 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                  <button onClick={() => openItemModal(catIndex, item, itemIndex)} className="p-1 text-gray-600"><Edit2 size={13} /></button>
                                                  <button onClick={() => removeItem(catIndex, itemIndex)} className="p-1 text-red-600"><Trash2 size={13} /></button>
                                                </div>
                                              </td>
                                            )}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-xs text-center text-gray-400 py-2">No items added to this category yet.</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Cost Summary */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm space-y-4 sticky top-4">
                      <h3 className="font-bold text-xs text-gray-700 uppercase">Pricing Calculation</h3>
                      
                      <div className="space-y-3 pt-2 text-xs">
                        <div className="flex justify-between items-center text-gray-600">
                          <span>Total Items:</span>
                          <span className="font-bold">{totals.itemCount}</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-600">
                          <span>Est. Cost Price / Head:</span>
                          <span className="font-bold">{formatCurrency(totals.totalCost)}</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-800 font-bold border-t pt-2 border-slate-300">
                          <span>Sale Price / Head:</span>
                          <span className="text-[#2563EB] text-base">{formatCurrency(totals.totalSale)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-emerald-600 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                          <span>Est. Profit Margin:</span>
                          <span>{totals.profit.toFixed(1)}%</span>
                        </div>
                      </div>

                      {modalMode !== 'view' && (
                        <Button 
                          onClick={handleSave} 
                          disabled={loading} 
                          className="w-full bg-[#2563EB] hover:bg-[#8B6914] text-white py-3 rounded-xl shadow-md font-bold mt-4 flex items-center justify-center gap-2"
                        >
                          {loading ? <LoadingSpinner size="sm" /> : <Save size={18} />}
                          {modalMode === 'edit' ? 'Update Menu' : 'Save Menu'}
                        </Button>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Item Modal (Custom Item) */}
      {showItemModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-300">
            <div className="flex justify-between items-center border-b pb-3 border-slate-300">
              <h3 className="font-bold text-gray-800 text-sm">
                {editingItemIndex !== null ? 'Edit Custom Item' : 'Add Custom Dish'}
              </h3>
              <button onClick={() => setShowItemModal(false)}><X size={18} className="text-gray-500" /></button>
            </div>

            <form onSubmit={handleItemSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Dish Name *</label>
                <Input value={itemForm.name} onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Special Chicken Biryani" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Cost Price (Rs)</label>
                  <Input type="number" value={itemForm.costPrice} onChange={(e) => setItemForm(prev => ({ ...prev, costPrice: e.target.value }))} placeholder="150" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Sale Price (Rs)</label>
                  <Input type="number" value={itemForm.salePrice} onChange={(e) => setItemForm(prev => ({ ...prev, salePrice: e.target.value }))} placeholder="250" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Unit Name</label>
                  <Input value={itemForm.unit} onChange={(e) => setItemForm(prev => ({ ...prev, unit: e.target.value }))} placeholder="plate" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Qty / Head</label>
                  <Input type="number" value={itemForm.quantityPerHead} onChange={(e) => setItemForm(prev => ({ ...prev, quantityPerHead: e.target.value }))} placeholder="1" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setShowItemModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#2563EB] text-white">Save Item</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}