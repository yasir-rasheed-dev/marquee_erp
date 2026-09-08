// import React, { useState } from 'react';
// import { Trash2, AlertTriangle, Package, ShieldAlert } from 'lucide-react';
// import inventoryApi from '../../services/inventoryApi';
// import { useBranch } from '../../context/BranchContext';
// import useGlobalData from '../../hooks/useGlobalData';
// import toast from 'react-hot-toast';

// export default function WastageReport() {
//   const { currentBranch } = useBranch();
//   const [form, setForm] = useState({ inventoryId: '', quantity: '', notes: '' });
//   const [loading, setLoading] = useState(false);

//   // Fetch items for selection
//   const { data: items } = useGlobalData(async (bId) => {
//     const res = await inventoryApi.getAll({ branchId: bId || currentBranch?.id });
//     return res?.data || res || [];
//   });

//   const selectedItem = Array.isArray(items) ? items.find(i => String(i.id) === String(form.inventoryId)) : null;

//   const handleWastage = async (e) => {
//     e.preventDefault();
//     if (!form.inventoryId || !form.quantity || !form.notes?.trim()) {
//       toast.error('Please fill in all required fields including the reason.');
//       return;
//     }

//     const qty = parseFloat(form.quantity);
//     if (selectedItem && qty > Number(selectedItem.currentStock)) {
//       toast.error(`Wastage quantity cannot exceed available stock (${selectedItem.currentStock} ${selectedItem.unit})`);
//       return;
//     }

//     setLoading(true);
//     try {
//       await inventoryApi.doTransaction({
//         inventoryId: parseInt(form.inventoryId),
//         type: 'WASTAGE',
//         quantity: qty,
//         notes: form.notes.trim(),
//         branchId: currentBranch?.id
//       });
//       toast.success('Wastage logged successfully');
//       setForm({ inventoryId: '', quantity: '', notes: '' });
//     } catch (err) {
//       toast.error(err?.response?.data?.message || 'Failed to log wastage');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
//       <div className="max-w-2xl mx-auto">
        
//         {/* Header */}
//         <div className="flex items-center gap-3 mb-6">
//           <div className="p-3 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white shadow-md">
//             <Trash2 className="w-6 h-6" />
//           </div>
//           <div>
//             <h1 className="text-2xl font-bold text-gray-800">Log Item Wastage / Spoilage</h1>
//             <p className="text-sm text-gray-600">
//               Record damaged, expired, or spoiled ingredients for <span className="font-semibold text-red-600">{currentBranch?.name || 'Current Branch'}</span>
//             </p>
//           </div>
//         </div>

//         {/* Main Box */}
//         <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm">
//           <form onSubmit={handleWastage} className="space-y-4">
            
//             {/* Item Selection */}
//             <div>
//               <label className="block text-xs font-medium text-gray-600 mb-1">Select Item *</label>
//               <select 
//                 value={form.inventoryId} 
//                 onChange={e => setForm({...form, inventoryId: e.target.value})} 
//                 className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30" 
//                 required
//               >
//                 <option value="">-- Choose Damaged/Wasted Item --</option>
//                 {Array.isArray(items) && items.map(i => (
//                   <option key={i.id} value={i.id}>
//                     {i.name} {i.code ? `(${i.code})` : ''} — Available: {i.currentStock} {i.unit}
//                   </option>
//                 ))}
//               </select>

//               {selectedItem && (
//                 <div className="mt-1.5 text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200 flex items-center justify-between">
//                   <span className="flex items-center gap-1.5">
//                     <Package size={14} className="text-red-600" />
//                     Available Stock: <b>{selectedItem.currentStock} {selectedItem.unit}</b>
//                   </span>
//                   <span className="font-mono text-gray-500">Category: {selectedItem.category}</span>
//                 </div>
//               )}
//             </div>

//             {/* Quantity */}
//             <div>
//               <label className="block text-xs font-medium text-gray-600 mb-1">Wasted Quantity * ({selectedItem?.unit || 'Units'})</label>
//               <input 
//                 type="number" 
//                 step="0.001" 
//                 placeholder="0.000" 
//                 value={form.quantity} 
//                 onChange={e => setForm({...form, quantity: e.target.value})} 
//                 className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 font-mono" 
//                 required 
//               />
//             </div>

//             {/* Reason Notes */}
//             <div>
//               <label className="block text-xs font-medium text-gray-600 mb-1">Reason for Wastage * (e.g., Spoiled, Burned, Expired)</label>
//               <textarea 
//                 placeholder="Provide a mandatory reason or explanation for auditing..." 
//                 value={form.notes} 
//                 onChange={e => setForm({...form, notes: e.target.value})} 
//                 className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/30" 
//                 rows={3} 
//                 required 
//               />
//             </div>

//             {/* Submit Button */}
//             <button 
//               type="submit" 
//               disabled={loading}
//               className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-xl shadow-md hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
//             >
//               <ShieldAlert size={18} />
//               {loading ? 'Logging Wastage...' : 'Record Item Wastage'}
//             </button>

//           </form>
//         </div>

//       </div>
//     </div>
//   );
// }