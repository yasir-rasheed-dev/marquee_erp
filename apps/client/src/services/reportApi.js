// ═══════════════════════════════════════════════════════════
// services/reportApi.js
// COMPLETE PROFIT & LOSS API AGGREGATOR (NO posApi)
// ═══════════════════════════════════════════════════════════

import bookingApi from './bookingApi';
import eventApi from './eventApi';
import purchaseApi from './purchaseApi';
import payrollApi from './payrollApi';
import accountApi from './accountApi';
import wastageLogApi from './wastageLogApi';
import inventoryApi from './inventoryApi';
import supplierApi from './supplierApi';
import kitchenOrderApi from './kitchenOrderApi';

// ── Helper: Sum array by key ──
const sumBy = (arr, key) => {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
};

// ── Helper: Extract data from response ──
const extractData = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
  if (res.data?.rows && Array.isArray(res.data.rows)) return res.data.rows;
  if (res.data?.results && Array.isArray(res.data.results)) return res.data.results;
  return res.data || [];
};

export default {
  // ═══════════════════════════════════════════════════════════
  // MAIN: Get Complete P&L Report
  // ═══════════════════════════════════════════════════════════
  getProfitLoss: async ({ fromDate, toDate, branchId } = {}) => {
    const params = { from: fromDate, to: toDate, branchId };
    
    console.log('📊 Fetching P&L Report:', { fromDate, toDate, branchId });

    try {
      // ── PARALLEL FETCH: Revenue ──
      const [
        bookingsRes,
        eventsRes,
      ] = await Promise.allSettled([
        bookingApi.getAll?.({ ...params, status: 'completed' }),
        eventApi.getAll?.({ ...params, status: 'completed' }),
      ]);

      // ── PARALLEL FETCH: COGS ──
      const [
        purchaseBillsRes,
        purchaseReturnsRes,
        inventoryTransactionsRes,
        kitchenOrdersRes,
      ] = await Promise.allSettled([
        purchaseApi.bills?.getAll?.(params),
        purchaseApi.returns?.getAll?.(params),
        inventoryApi.getAll?.(params),
        kitchenOrderApi.getAll?.(params),
      ]);

      // ── PARALLEL FETCH: Operating Expenses ──
      const [
        payrollsRes,
        staffPaymentsRes,
        eventAssignmentsRes,
        loansRes,
        expenseVouchersRes,
        paymentVouchersRes,
        wastageLogsRes,
        supplierPaymentsRes,
      ] = await Promise.allSettled([
        payrollApi.getAllPayrolls?.(params),
        payrollApi.getAllStaffPayments?.(params),
        payrollApi.getAllEventAssignments?.(params),
        payrollApi.getAllLoans?.(params),
        accountApi.getAllTransactions?.({ ...params, type: 'expense' }),
        accountApi.getAllTransactions?.({ ...params, type: 'payment' }),
        wastageLogApi.getAll?.(params),
        supplierApi.getAll?.({ ...params, withPayments: true }),
      ]);

      // ═══════════════════════════════════════════════════════
      // 1. REVENUE CALCULATION
      // ═══════════════════════════════════════════════════════
      const bookings = extractData(bookingsRes.status === 'fulfilled' ? bookingsRes.value : []);
      const events = extractData(eventsRes.status === 'fulfilled' ? eventsRes.value : []);

      const revenue = {
        bookings: {
          label: 'Booking Revenue',
          amount: sumBy(bookings, 'totalAmount') || sumBy(bookings, 'grandTotal') || sumBy(bookings, 'amount') || 0,
          count: bookings.length,
          details: bookings.map(b => ({
            id: b.id,
            ref: b.bookingNumber || b.reference,
            amount: b.totalAmount || b.grandTotal || b.amount || 0,
            date: b.eventDate || b.date,
            customer: b.customerName || b.customer?.name,
          })),
        },
        events: {
          label: 'Event Revenue',
          amount: sumBy(events, 'totalCost') || sumBy(events, 'revenue') || sumBy(events, 'amount') || 0,
          count: events.length,
        },
        otherIncome: {
          label: 'Other Income',
          amount: 0,
          count: 0,
        },
        total: 0,
      };
      revenue.total = revenue.bookings.amount + revenue.events.amount + revenue.otherIncome.amount;

      // ═══════════════════════════════════════════════════════
      // 2. COST OF GOODS SOLD (COGS)
      // ═══════════════════════════════════════════════════════
      const purchaseBills = extractData(purchaseBillsRes.status === 'fulfilled' ? purchaseBillsRes.value : []);
      const purchaseReturns = extractData(purchaseReturnsRes.status === 'fulfilled' ? purchaseReturnsRes.value : []);
      const inventoryItems = extractData(inventoryTransactionsRes.status === 'fulfilled' ? inventoryTransactionsRes.value : []);
      const kitchenOrders = extractData(kitchenOrdersRes.status === 'fulfilled' ? kitchenOrdersRes.value : []);

      const cogs = {
        purchaseCost: {
          label: 'Purchase Cost (GRN/Bills)',
          amount: sumBy(purchaseBills, 'total') || sumBy(purchaseBills, 'grandTotal') || sumBy(purchaseBills, 'amount') || 0,
          count: purchaseBills.length,
          details: purchaseBills.map(b => ({
            id: b.id,
            billNo: b.billNumber || b.grnNumber,
            amount: b.total || b.grandTotal || b.amount || 0,
            supplier: b.supplierName || b.supplier?.name,
            date: b.billDate || b.date,
          })),
        },
        purchaseReturns: {
          label: 'Purchase Returns',
          amount: -(sumBy(purchaseReturns, 'total') || sumBy(purchaseReturns, 'amount') || 0),
          count: purchaseReturns.length,
        },
        inventoryConsumed: {
          label: 'Inventory Consumed',
          amount: inventoryItems.reduce((acc, item) => {
            const consumed = Number(item.consumedQty) || Number(item.usedQty) || 0;
            const avgCost = Number(item.avgCost) || Number(item.unitCost) || Number(item.cost) || 0;
            return acc + (consumed * avgCost);
          }, 0),
          count: inventoryItems.length,
        },
        kitchenProduction: {
          label: 'Kitchen Production Cost',
          amount: sumBy(kitchenOrders, 'productionCost') || sumBy(kitchenOrders, 'cost') || sumBy(kitchenOrders, 'totalCost') || 0,
          count: kitchenOrders.length,
        },
        total: 0,
      };
      cogs.total = cogs.purchaseCost.amount + cogs.purchaseReturns.amount + cogs.inventoryConsumed.amount + cogs.kitchenProduction.amount;

      // ═══════════════════════════════════════════════════════
      // 3. OPERATING EXPENSES
      // ═══════════════════════════════════════════════════════
      const payrolls = extractData(payrollsRes.status === 'fulfilled' ? payrollsRes.value : []);
      const staffPayments = extractData(staffPaymentsRes.status === 'fulfilled' ? staffPaymentsRes.value : []);
      const eventAssignments = extractData(eventAssignmentsRes.status === 'fulfilled' ? eventAssignmentsRes.value : []);
      const loans = extractData(loansRes.status === 'fulfilled' ? loansRes.value : []);
      const expenseVouchers = extractData(expenseVouchersRes.status === 'fulfilled' ? expenseVouchersRes.value : []);
      const paymentVouchers = extractData(paymentVouchersRes.status === 'fulfilled' ? paymentVouchersRes.value : []);
      const wastageLogs = extractData(wastageLogsRes.status === 'fulfilled' ? wastageLogsRes.value : []);
      const suppliers = extractData(supplierPaymentsRes.status === 'fulfilled' ? supplierPaymentsRes.value : []);

      // Categorize expense vouchers
      const rentExpenses = expenseVouchers.filter(v => 
        (v.category || v.type || v.description || '').toLowerCase().includes('rent')
      );
      const utilityExpenses = expenseVouchers.filter(v => 
        ['electric', 'electricity', 'gas', 'water', 'utility', 'bijli', 'bill'].some(k => 
          (v.category || v.type || v.description || '').toLowerCase().includes(k)
        )
      );
      const taxExpenses = expenseVouchers.filter(v => 
        ['tax', 'gst', 'vat', 'income tax'].some(k => 
          (v.category || v.type || v.description || '').toLowerCase().includes(k)
        )
      );
      const otherExpenses = expenseVouchers.filter(v => 
        !rentExpenses.includes(v) && !utilityExpenses.includes(v) && !taxExpenses.includes(v)
      );

      const expenses = {
        salaries: {
          label: 'Salaries & Wages',
          amount: sumBy(payrolls, 'netSalary') || sumBy(payrolls, 'totalAmount') || sumBy(payrolls, 'amount') || 0,
          count: payrolls.length,
          details: payrolls.map(p => ({
            id: p.id,
            employee: p.employeeName || p.employee?.name,
            amount: p.netSalary || p.totalAmount || p.amount || 0,
            month: p.month || p.period,
          })),
        },
        eventStaff: {
          label: 'Event Staff Payments',
          amount: sumBy(eventAssignments, 'paymentAmount') || sumBy(eventAssignments, 'amount') || sumBy(eventAssignments, 'wages') || 0,
          count: eventAssignments.length,
        },
        staffPayments: {
          label: 'Direct Staff Payments',
          amount: sumBy(staffPayments, 'amount') || sumBy(staffPayments, 'paymentAmount') || 0,
          count: staffPayments.length,
        },
        loans: {
          label: 'Loan Installments & Advances',
          amount: sumBy(loans, 'installmentAmount') || sumBy(loans, 'amount') || sumBy(loans, 'paidAmount') || 0,
          count: loans.length,
        },
        supplierPayments: {
          label: 'Supplier Payments',
          amount: sumBy(suppliers, 'paymentAmount') || sumBy(suppliers, 'paidAmount') || sumBy(suppliers, 'amount') || 0,
          count: suppliers.length,
        },
        rent: {
          label: 'Rent',
          amount: sumBy(rentExpenses, 'amount') || sumBy(rentExpenses, 'total') || 0,
          count: rentExpenses.length,
        },
        utilities: {
          label: 'Utilities (Electricity, Gas, Water)',
          amount: sumBy(utilityExpenses, 'amount') || sumBy(utilityExpenses, 'total') || 0,
          count: utilityExpenses.length,
        },
        taxes: {
          label: 'Taxes',
          amount: sumBy(taxExpenses, 'amount') || sumBy(taxExpenses, 'total') || 0,
          count: taxExpenses.length,
        },
        wastage: {
          label: 'Damage / Wastage Loss',
          amount: wastageLogs.reduce((acc, w) => {
            const qty = Number(w.quantity) || Number(w.wastageQty) || 0;
            const cost = Number(w.cost) || Number(w.unitCost) || Number(w.amount) || 0;
            return acc + (qty * cost);
          }, 0),
          count: wastageLogs.length,
          details: wastageLogs.map(w => ({
            id: w.id,
            item: w.itemName || w.inventoryItem?.name,
            qty: w.quantity || w.wastageQty,
            cost: w.cost || w.unitCost,
            reason: w.reason,
            date: w.date,
          })),
        },
        otherExpenses: {
          label: 'Other Expenses',
          amount: sumBy(otherExpenses, 'amount') || sumBy(otherExpenses, 'total') || 0,
          count: otherExpenses.length,
        },
        paymentVouchers: {
          label: 'Payment Vouchers',
          amount: sumBy(paymentVouchers, 'amount') || sumBy(paymentVouchers, 'total') || 0,
          count: paymentVouchers.length,
        },
        total: 0,
      };
      
      expenses.total = 
        expenses.salaries.amount +
        expenses.eventStaff.amount +
        expenses.staffPayments.amount +
        expenses.loans.amount +
        expenses.supplierPayments.amount +
        expenses.rent.amount +
        expenses.utilities.amount +
        expenses.taxes.amount +
        expenses.wastage.amount +
        expenses.otherExpenses.amount +
        expenses.paymentVouchers.amount;

      // ═══════════════════════════════════════════════════════
      // 4. FINAL CALCULATIONS
      // ═══════════════════════════════════════════════════════
      const grossProfit = revenue.total - cogs.total;
      const netProfit = grossProfit - expenses.total;
      const profitMargin = revenue.total > 0 ? ((netProfit / revenue.total) * 100).toFixed(2) : 0;

      const report = {
        period: { from: fromDate, to: toDate },
        revenue,
        cogs,
        grossProfit,
        expenses,
        netProfit,
        profitMargin: Number(profitMargin),
        summary: {
          totalRevenue: revenue.total,
          totalCOGS: cogs.total,
          grossProfit,
          totalExpenses: expenses.total,
          netProfit,
          isProfit: netProfit >= 0,
        },
        meta: {
          generatedAt: new Date().toISOString(),
          branchId,
          dataPoints: {
            bookings: bookings.length,
            events: events.length,
            purchaseBills: purchaseBills.length,
            payrolls: payrolls.length,
            wastageLogs: wastageLogs.length,
          },
        },
      };

      console.log('✅ P&L Report Generated:', report.summary);
      return { success: true, data: report };

    } catch (err) {
      console.error('❌ P&L Report Error:', err);
      return { success: false, error: err.message || 'Failed to generate P&L report' };
    }
  },

  // ═══════════════════════════════════════════════════════════
  // MINI: Quick Summary (Faster - fewer APIs)
  // ═══════════════════════════════════════════════════════════
  getQuickSummary: async ({ fromDate, toDate } = {}) => {
    const params = { from: fromDate, to: toDate };
    
    try {
      const [bookingsRes, payrollsRes, expensesRes, purchasesRes] = await Promise.allSettled([
        bookingApi.getAll?.({ ...params, status: 'completed' }),
        payrollApi.getAllPayrolls?.(params),
        accountApi.getAllTransactions?.({ ...params, type: 'expense' }),
        purchaseApi.bills?.getAll?.(params),
      ]);

      const bookings = extractData(bookingsRes.status === 'fulfilled' ? bookingsRes.value : []);
      const payrolls = extractData(payrollsRes.status === 'fulfilled' ? payrollsRes.value : []);
      const expenses = extractData(expensesRes.status === 'fulfilled' ? expensesRes.value : []);
      const purchases = extractData(purchasesRes.status === 'fulfilled' ? purchasesRes.value : []);

      const revenue = sumBy(bookings, 'totalAmount') || sumBy(bookings, 'grandTotal') || 0;
      const cogs = sumBy(purchases, 'total') || sumBy(purchases, 'amount') || 0;
      const salaries = sumBy(payrolls, 'netSalary') || sumBy(payrolls, 'amount') || 0;
      const otherExpenses = sumBy(expenses, 'amount') || sumBy(expenses, 'total') || 0;

      const grossProfit = revenue - cogs;
      const netProfit = grossProfit - salaries - otherExpenses;

      return {
        success: true,
        data: {
          revenue,
          cogs,
          grossProfit,
          salaries,
          otherExpenses,
          netProfit,
          profitMargin: revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0,
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};