// import React, { useState } from 'react';
// import { Truck, ArrowRightLeft, Package, Send, CheckCircle2 } from 'lucide-react';
// import inventoryApi from '../../services/inventoryApi';
// import { useBranch } from '../../context/BranchContext';
// import useGlobalData from '../../hooks/useGlobalData';
// import toast from 'react-hot-toast';

// export default function CentralKitchenTransfer() {
//   const { currentBranch } = useBranch();
//   const [form, setForm] = useState({ inventoryId: '', toBranchId: '', quantity: '', notes: '' });
//   const [loading, setLoading] = useState(false);

//   // Fetch items for selection
//   const { data: items } = useGlobalData(async (bId) => {
//     const res = await inventoryApi.getAll({ branchId: bId || currentBranch?.id });
//     return res?.data || res || [];
//   });

//   const selectedItem = Array.isArray(items) ? items.find(i => String(i.id) === String(form.inventoryId)) : null;

//   const handleCentralTransfer = async (e) => {
//     e.preventDefault();
//     if (!form.inventoryId || !form.toBranchId || !form.quantity) {
//       toast.error('Please fill in all required fields.');
//       return;
//     }

//     const qty = parseFloat(form.quantity);
//     if (selectedItem && qty > Number(selectedItem.currentStock)) {
//       toast.error(`Transfer quantity exceeds available central stock (${selectedItem.currentStock} ${selectedItem.unit})`);
//       return;
//     }

//     setLoading(true);
//     try {
//       await inventoryApi.doTransaction({
//         inventoryId: parseInt(form.inventoryId),
//         type: 'TRANSFER_OUT',
//         quantity: qty,
//         toBranchId: parseInt(form.toBranchId),
//         notes: `[Central Kitchen Dispatch] ${form.notes?.trim() || 'Sent from Central Kitchen'}`,
//         branchId: currentBranch?.id
//       });
//       toast.success('Central Kitchen transfer dispatched successfully!');
//       setForm({ inventoryId: '', toBranchId: '', quantity: '', notes: '' });
//     } catch (err) {
//       toast.error(err?.response?.data?.message || 'Central transfer failed');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F2EB' }}>
//       <div className="max-w-2xl mx-auto">
        
//         {/* Header */}
//         <div className="flex items-center gap-3 mb-6">
//           <div className="p-3 rounded-2xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] text-white shadow-md">
//             <Truck className="w-6 h-6" />
//           </div>
//           <div>
//             <h1 className="text-2xl font-bold text-gray-800">Central Kitchen & Warehouse Dispatch</h1>
//             <p className="text-sm text-gray-600">
//               Dispatch bulk stock items from Central Kitchen to destination outlets (<span className="font-semibold text-[#A97A1F]">{currentBranch?.name || 'HQ'}</span>)
//             </p>
//           </div>
//         </div>

//         {/* Main Box */}
//         <div className="bg-white p-6 rounded-2xl border border-[#E0D8CC] shadow-sm">
//           <form onSubmit={handleCentralTransfer} className="space-y-4">
            
//             {/* Item Dropdown */}
//             <div>
//               <label className="block text-xs font-medium text-gray-600 mb-1">Select Central Item / Ingredient *</label>
//               <select 
//                 value={form.inventoryId} 
//                 onChange={e => setForm({...form, inventoryId: e.target.value})} 
//                 className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/30" 
//                 required
//               >
//                 <option value="">-- Choose Warehouse Item --</option>
//                 {Array.isArray(items) && items.map(i => (
//                   <option key={i.id} value={i.id}>
//                     {i.name} {i.code ? `(${i.code})` : ''} — Central Stock: {i.currentStock} {i.unit}
//                   </option>
//                 ))}
//               </select>
              
//               {selectedItem && (
//                 <div className="mt-1.5 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between">
//                   <span className="flex items-center gap-1.5">
//                     <Package size={14} className="text-[#A97A1F]" />
//                     Central Stock Available: <b>{selectedItem.currentStock} {selectedItem.unit}</b>
//                   </span>
//                   <span className="font-mono text-gray-500">Category: {selectedItem.category}</span>
//                 </div>
//               )}
//             </div>

//             {/* Destination Outlet Branch ID */}
//             <div>
//               <label className="block text-xs font-medium text-gray-600 mb-1">Target Outlet Branch ID *</label>
//               <input 
//                 type="number" 
//                 placeholder="Enter destination branch ID (e.g. 2)" 
//                 value={form.toBranchId} 
//                 onChange={e => setForm({...form, toBranchId: e.target.value})} 
//                 className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/30" 
//                 required 
//               />
//             </div>

//             {/* Quantity */}
//             <div>
//               <label className="block text-xs font-medium text-gray-600 mb-1">Dispatch Quantity * ({selectedItem?.unit || 'Units'})</label>
//               <input 
//                 type="number" 
//                 step="0.001" 
//                 placeholder="0.000" 
//                 value={form.quantity} 
//                 onChange={e => setForm({...form, quantity: e.target.value})} 
//                 className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/30 font-mono" 
//                 required 
//               />
//             </div>

//             {/* Dispatch Notes */}
//             <div>
//               <label className="block text-xs font-medium text-gray-600 mb-1">Dispatch Notes / Vehicle / Driver Details</label>
//               <textarea 
//                 placeholder="Add shipment remarks, batch numbers, or driver details..." 
//                 value={form.notes} 
//                 onChange={e => setForm({...form, notes: e.target.value})} 
//                 className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/30" 
//                 rows={3} 
//               />
//             </div>

//             {/* Submit Button */}
//             <button 
//               type="submit" 
//               disabled={loading}
//               className="w-full py-3.5 bg-gradient-to-r from-[#A97A1F] to-[#C89B3C] text-white font-bold rounded-xl shadow-md hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
//             >
//               <Send size={16} />
//               {loading ? 'Dispatching Shipment...' : 'Dispatch Central Shipment'}
//             </button>

//           </form>
//         </div>

//       </div>
//     </div>
//   );
// }