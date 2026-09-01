// ═══════════════════════════════════════════════════════════
// pages/TaxConfiguration.jsx
// Updated to use taxRateApi service & match ERP design system
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X, Percent, Check } from 'lucide-react';
import taxRateApi from '../../services/taxRateApi';
import toast from 'react-hot-toast';

export default function TaxConfiguration() {
  const [taxRates, setTaxRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    rate: '',
    isActive: true
  });

  // Get selected branch from local storage
  const selectedBranch = JSON.parse(localStorage.getItem('selectedBranch') || '{}');
  const branchId = selectedBranch?.id;

  const fetchTaxRates = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      const res = await taxRateApi.getAll({ branchId, search });
      setTaxRates(res.data?.data || res.data || []);
    } catch (err) {
      toast.error('Failed to load tax rates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxRates();
  }, [search, branchId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.rate === '') {
      toast.error('Name and rate are required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...form, branchId };
      if (editingId) {
        await taxRateApi.update(editingId, payload);
        toast.success('Tax rate updated successfully!');
      } else {
        await taxRateApi.create(payload);
        toast.success('Tax rate created successfully!');
      }
      setShowModal(false);
      resetForm();
      fetchTaxRates();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error saving tax rate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tax) => {
    setForm({
      name: tax.name,
      rate: tax.rate,
      isActive: tax.isActive
    });
    setEditingId(tax.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this tax rate?')) return;
    try {
      await taxRateApi.delete(id);
      toast.success('Tax rate deleted!');
      fetchTaxRates();
    } catch (err) {
      toast.error('Failed to delete tax rate');
    }
  };

  const resetForm = () => {
    setForm({ name: '', rate: '', isActive: true });
    setEditingId(null);
  };

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: '#F5F2EB' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] shadow-md">
              <Percent className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tax Rates Management</h1>
              <p className="text-sm text-gray-600">Configure global or branch-level tax structures</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white shadow-md hover:scale-105 transition-all"
          >
            <Plus size={18} /> Add Tax Rate
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E0D8CC] p-4 mb-6">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tax rates by name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E0D8CC] bg-[#FAF8F4] text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/20"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-2xl border border-[#E0D8CC] shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-[#A97A1F] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : taxRates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No tax rates found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF8F4] border-b border-[#E0D8CC] text-xs uppercase font-bold text-gray-600">
                  <th className="p-4">Tax Name</th>
                  <th className="p-4">Rate (%)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0D8CC] text-sm">
                {taxRates.map((tax) => (
                  <tr key={tax.id} className="hover:bg-[#FAF8F4]/50">
                    <td className="p-4 font-bold text-gray-900">{tax.name}</td>
                    <td className="p-4 font-mono font-semibold text-[#A97A1F]">{tax.rate}%</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${tax.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {tax.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(tax)} className="p-1.5 rounded-lg hover:bg-[#F4E7C9] text-gray-600 hover:text-[#A97A1F]">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(tax.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Form */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-[#E0D8CC]">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E0D8CC]">
                <h3 className="font-bold text-lg text-gray-900">
                  {editingId ? 'Edit Tax Rate' : 'New Tax Rate'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1">Tax Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. GST, Service Tax"
                    className="w-full border rounded-xl px-3 py-2 text-sm border-[#E0D8CC] bg-[#FAF8F4]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1">Rate (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.rate}
                    onChange={(e) => setForm({ ...form, rate: e.target.value })}
                    placeholder="e.g. 16.00"
                    className="w-full border rounded-xl px-3 py-2 text-sm border-[#E0D8CC] bg-[#FAF8F4]"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 accent-[#A97A1F]"
                  />
                  <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">Is Active</label>
                </div>

                <div className="flex gap-2 pt-4 border-t border-[#E0D8CC]">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-[#E0D8CC] rounded-xl py-2.5 text-sm font-bold">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="flex-1 rounded-xl py-2.5 text-white text-sm font-bold shadow-md bg-gradient-to-r from-[#A97A1F] to-[#C89B3C]">
                    {submitting ? 'Saving...' : 'Save Tax Rate'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}