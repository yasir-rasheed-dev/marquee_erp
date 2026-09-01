// import React, { useState } from 'react';
// import { Layers, Search, DollarSign, Package, TrendingUp } from 'lucide-react';
// import inventoryApi from '../../services/inventoryApi';
// import { useBranch } from '../../context/BranchContext';
// import useGlobalData from '../../hooks/useGlobalData';

// export default function StockList() {
//   const { currentBranch } = useBranch();
//   const [search, setSearch] = useState('');

//   const { data: items } = useGlobalData(
//     async (bId) => {
//       const res = await inventoryApi.getAll({ search, branchId: bId || currentBranch?.id });
//       return res?.data || res || [];
//     },
//     { dependencies: [search] }
//   );

//   const itemList = Array.isArray(items) ? items : [];

//   // Calculate Summary Metrics
//   const totalItemsCount = itemList.length;
//   const totalStockUnits = itemList.reduce((sum, item) => sum + Number(item.currentStock || 0), 0);
//   const totalValuation = itemList.reduce((sum, item) => sum + (Number(item.currentStock || 0) * Number(item.avgCostPrice || 0)), 0);

//   return (
//     <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F2EB' }}>
//       <div className="max-w-7xl mx-auto">
        
//         {/* Header */}
//         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
//           <div className="flex items-center gap-3">
//             <div className="p-3 rounded-2xl bg-gradient-to-br from-[#A97A1F] to-[#C89B3C] text-white shadow-md">
//               <Layers className="w-6 h-6" />
//             </div>
//             <div>
//               <h1 className="text-2xl font-bold text-gray-800">Current Stock Inventory Valuation</h1>
//               <p className="text-sm text-gray-600">
//                 Real-time stock valuation and asset summary for <span className="font-semibold text-[#A97A1F]">{currentBranch?.name || 'Selected Branch'}</span>
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Analytics Summary Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//           <div className="bg-white p-5 rounded-2xl border border-[#E0D8CC] shadow-sm flex items-center justify-between">
//             <div>
//               <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Unique Items</p>
//               <h3 className="text-2xl font-bold text-gray-800 mt-1 font-mono">{totalItemsCount}</h3>
//             </div>
//             <div className="p-3 bg-amber-50 rounded-xl text-[#A97A1F]">
//               <Package size={22} />
//             </div>
//           </div>

//           <div className="bg-white p-5 rounded-2xl border border-[#E0D8CC] shadow-sm flex items-center justify-between">
//             <div>
//               <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Stock Units</p>
//               <h3 className="text-2xl font-bold text-gray-800 mt-1 font-mono">{totalStockUnits.toLocaleString()}</h3>
//             </div>
//             <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
//               <TrendingUp size={22} />
//             </div>
//           </div>

//           <div className="bg-white p-5 rounded-2xl border border-[#E0D8CC] shadow-sm flex items-center justify-between">
//             <div>
//               <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Asset Valuation</p>
//               <h3 className="text-2xl font-bold text-emerald-700 mt-1 font-mono">Rs {totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
//             </div>
//             <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
//               <DollarSign size={22} />
//             </div>
//           </div>
//         </div>

//         {/* Search Filter */}
//         <div className="bg-white p-4 rounded-2xl border border-[#E0D8CC] mb-6 shadow-sm">
//           <div className="relative">
//             <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
//             <input 
//               type="text" 
//               value={search} 
//               onChange={e => setSearch(e.target.value)} 
//               placeholder="Search stock items by name or code..." 
//               className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A97A1F]/30" 
//             />
//           </div>
//         </div>

//         {/* Valuation Table */}
//         <div className="bg-white rounded-2xl border border-[#E0D8CC] overflow-hidden shadow-sm">
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm text-left">
//               <thead className="bg-[#F5F2EB] border-b border-[#E0D8CC] text-gray-700 font-semibold">
//                 <tr>
//                   <th className="p-4">Item Details</th>
//                   <th className="p-4">Category</th>
//                   <th className="p-4 text-right">Current Stock</th>
//                   <th className="p-4 text-right">Avg Cost</th>
//                   <th className="p-4 text-right">Total Valuation</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-100">
//                 {itemList.length > 0 ? (
//                   itemList.map(item => {
//                     const stock = Number(item.currentStock || 0);
//                     const cost = Number(item.avgCostPrice || 0);
//                     const valuation = stock * cost;

//                     return (
//                       <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
//                         <td className="p-4">
//                           <div className="font-medium text-gray-800">{item.name}</div>
//                           <div className="text-xs text-gray-400 font-mono mt-0.5">{item.code || '—'}</div>
//                         </td>
//                         <td className="p-4">
//                           <span className="px-2.5 py-1 bg-amber-50 text-[#A97A1F] rounded-lg text-xs font-medium border border-amber-200">
//                             {item.category}
//                           </span>
//                         </td>
//                         <td className="p-4 text-right font-mono font-bold text-[#A97A1F]">
//                           {stock} <span className="text-xs text-gray-500 font-normal">{item.unit}</span>
//                         </td>
//                         <td className="p-4 text-right font-mono text-gray-700">
//                           Rs {cost.toLocaleString()}
//                         </td>
//                         <td className="p-4 text-right font-mono font-bold text-gray-900">
//                           Rs {valuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
//                         </td>
//                       </tr>
//                     );
//                   })
//                 ) : (
//                   <tr>
//                     <td colSpan="5" className="p-8 text-center text-gray-400">
//                       No stock valuation records found.
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }