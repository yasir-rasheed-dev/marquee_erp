import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import PrivateRoute from './PrivateRoute';

// ═══════════════════════════════════════════════════════════
// 🎯 LAZY IMPORTS (sab same rahenge)
// ═══════════════════════════════════════════════════════════
const Login = lazy(() => import('../pages/Auth/Login'));
const Register = lazy(() => import('../pages/Auth/Register'));
const ForgotPassword = lazy(() => import('../pages/Auth/ForgotPassword'));
const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard'));
// ═══════════════════════════════════════════════════════════
// 🎯 Bookings
// ═══════════════════════════════════════════════════════════
const BookingList = lazy(() => import('../pages/Bookings/BookingList'));
const BookingCreate = lazy(() => import('../pages/Bookings/BookingCreate'));
const BookingDetail = lazy(() => import('../pages/Bookings/BookingDetail'));
const BookingEdit = lazy(() => import('../pages/Bookings/BookingEdit'));
const BookingCalendar = lazy(() => import('../pages/Bookings/BookingCalendar'));
const BookingCancel = lazy(() => import('../pages/Bookings/BookingCancel'));
const BookingPostpone = lazy(() => import('../pages/Bookings/BookingPostpone'));
const BookingContract = lazy(() => import('../pages/Bookings/BookingContract'));
const BookingQuotation = lazy(() => import('../pages/Bookings/BookingQuotation'));
// ═══════════════════════════════════════════════════════════
// 🎯 Customer
// ═══════════════════════════════════════════════════════════
const CustomerCreate = lazy(() => import('../pages/Customer/CustomerManagement'));
const CustomerList = lazy(() => import('../pages/Customer/CustomerList'));
// ═══════════════════════════════════════════════════════════
// 🎯 Events
// ═══════════════════════════════════════════════════════════
const EventList = lazy(() => import('../pages/Events/EventList'));
const EventAdd = lazy(() => import('../pages/Events/EventAdd'));
const EventCosting = lazy(() => import('../pages/Events/EventCosting'));
const EventInventoryAllocation = lazy(() => import('../pages/Events/EventInventoryAllocation'));
const EventStaffing = lazy(() => import('../pages/Events/EventStaffing'));
const EventTimeline = lazy(() => import('../pages/Events/EventTimeline'));
// ═══════════════════════════════════════════════════════════
// 🎯 Services
// ═══════════════════════════════════════════════════════════
const ServicesList = lazy(() => import('../pages/Services/ServiceList'));
// ═══════════════════════════════════════════════════════════
// 🎯 POS
// ═══════════════════════════════════════════════════════════
const POSTerminal = lazy(() => import('../pages/POS/POSTerminal'));
const POSCart = lazy(() => import('../pages/POS/POSCart'));
const POSSuspendedTickets = lazy(() => import('../pages/POS/POSSuspendedTickets'));
const POSRefund = lazy(() => import('../pages/POS/POSRefund'));
const POSCashDrawer = lazy(() => import('../pages/POS/POSCashDrawer'));
const POSReports = lazy(() => import('../pages/POS/POSReports'));
// ═══════════════════════════════════════════════════════════
// 🎯 Inventory
// ═══════════════════════════════════════════════════════════
const StockList = lazy(() => import('../pages/Inventory/StockList'));
const ItemMaster = lazy(() => import('../pages/Inventory/ItemMaster'));
const StockTransfer = lazy(() => import('../pages/Inventory/StockTransfer'));
const StockAdjustment = lazy(() => import('../pages/Inventory/StockAdjustment'));
const CentralKitchenTransfer = lazy(() => import('../pages/Inventory/CentralKitchenTransfer'));
const WastageReport = lazy(() => import('../pages/Inventory/WastageReport'));
// ═══════════════════════════════════════════════════════════
// 🎯 Kitchen
// ═══════════════════════════════════════════════════════════
const KitchenSheet = lazy(() => import('../pages/Kitchen/KitchenSheet'));
const KDS = lazy(() => import('../pages/Kitchen/KDS'));
const ProductionPlan = lazy(() => import('../pages/Kitchen/ProductionPlan'));
const RecipeManager = lazy(() => import('../pages/Kitchen/RecipeManager'));
const WastageLog = lazy(() => import('../pages/Kitchen/WastageLog'));
// ═══════════════════════════════════════════════════════════
// 🎯 Menus
// ═══════════════════════════════════════════════════════════
const MenuList = lazy(() => import('../pages/Menus/MenuList'));
const MenuAdd = lazy(() => import('../pages/Menus/MenuAdd'));
const Unit = lazy(() => import('../pages/Menus/Unit'));
const CategoryList = lazy(() => import('../pages/Menus/CategoryList'));
const ItemList = lazy(() => import('../pages/Menus/itemlist'));
const Packages = lazy(() => import('../pages/Menus/PackageAdd'));
// ═══════════════════════════════════════════════════════════
// 🎯 Accounts
// ═══════════════════════════════════════════════════════════
const VoucherList = lazy(() => import('../pages/Accounts/VoucherList'));
const JournalVoucher = lazy(() => import('../pages/Accounts/JournalVoucher'));
const JournalVoucherList = lazy(() => import('../pages/Accounts/JournalVoucherList'));
const ExpenseVoucher = lazy(() => import('../pages/Accounts/ExpenseVoucher'));
const ExpenseVoucherList = lazy(() => import('../pages/Accounts/ExpenseVoucherList'));
const PaymentVoucher = lazy(() => import('../pages/Accounts/PaymentVoucher'));
const PaymentVoucherList = lazy(() => import('../pages/Accounts/PaymentVoucherList'));
const Ledger = lazy(() => import('../pages/Accounts/Ledger'));
const DayBook = lazy(() => import('../pages/Accounts/DayBook'));
const TrialBalance = lazy(() => import('../pages/Accounts/TrialBalance'));
const ChartOfAccounts = lazy(() => import('../pages/Accounts/ChartOfAccounts'));
const ProfitLoss = lazy(() => import('../pages/Accounts/ProfitLoss'));
const BalanceSheet = lazy(() => import('../pages/Accounts/BalanceSheet'));
const AccountsList = lazy(() => import('../pages/Accounts/AccountsList'));
// ═══════════════════════════════════════════════════════════
// 🎯 Fixed Assests
// ═══════════════════════════════════════════════════════════
const AssetList = lazy(() => import('../pages/FixedAssets/AssetList'));
const AddAssets = lazy(() => import('../pages/FixedAssets/FixedAssets'));
const AssetAdjustments = lazy(() => import('../pages/FixedAssets/AssetAdjustments'));
// ═══════════════════════════════════════════════════════════
// 🎯 Procurement
// ═══════════════════════════════════════════════════════════
const SupplierForm = lazy(() => import('../pages/Procurement/SupplierForm'));
const SupplierLedger = lazy(() => import('../pages/Procurement/SupplierLedger'));
const PurchaseOrderList = lazy(() => import('../pages/Procurement/PurchaseOrderList'));
const PurchaseOrderCreate = lazy(() => import('../pages/Procurement/PurchaseOrderCreate'));
const GoodsReceivedNote = lazy(() => import('../pages/Procurement/GoodsReceivedNote'));
const PurchaseReturn = lazy(() => import('../pages/Procurement/PurchaseReturn'));
// ═══════════════════════════════════════════════════════════
// 🎯 HR
// ═══════════════════════════════════════════════════════════
const StaffList = lazy(() => import('../pages/HR/StaffList'));
const EmployeeForm = lazy(() => import('../pages/HR/EmployeeForm'));
const EmployeeDetail = lazy(() => import('../pages/HR/EmployeeDetail'));
const Attendance = lazy(() => import('../pages/HR/Attendance'));
const Payroll = lazy(() => import('../pages/HR/Payroll'));
const LeaveManagement = lazy(() => import('../pages/HR/LeaveManagement'));
const AdvanceLoan = lazy(() => import('../pages/HR/AdvanceLoan'));
const EventStaffAllocation = lazy(() => import('../pages/HR/EventStaffAllocation'));
const DepartmentDesignationManager = lazy(() => import('../pages/HR/DepartmentDesignationManager'));
// ═══════════════════════════════════════════════════════════
// 🎯 Reports
// ═══════════════════════════════════════════════════════════
const ReportsLayout = lazy(() => import('../pages/Reports/ReportsLayout'));
const ReportsDashboard = lazy(() => import('../pages/Reports/ReportsDashboard'));
const BookingReports = lazy(() => import('../pages/Reports/BookingReports'));
const InventoryReports = lazy(() => import('../pages/Reports/InventoryReports'));
const HRReports = lazy(() => import('../pages/Reports/HRReports'));
const FinanceReports = lazy(() => import('../pages/Reports/FinanceReports'));
const KitchenReport = lazy(() => import('../pages/Reports/KitchenProductionReports'));
const PurchaseReports = lazy(() => import('../pages/Reports/PurchaseReports'));
const CustomerReport = lazy(() => import('../pages/Reports/CustomerSalesReports'));
const Profit_Loss = lazy(() => import('../pages/Reports/ProfitLossReport'));
// ═══════════════════════════════════════════════════════════
// 🎯 Setting
// ═══════════════════════════════════════════════════════════
const BranchSettings = lazy(() => import('../pages/Settings/BranchSettings'));
const HallSettings = lazy(() => import('../pages/Settings/HallSettings'));
const TaxConfiguration = lazy(() => import('../pages/Settings/TaxConfiguration'));
const RoleManagement = lazy(() => import('../pages/Settings/RoleManagement'));
const BackupRestore = lazy(() => import('../pages/Settings/BackupRestore'));
const ReceiptSettings = lazy(() => import('../pages/Settings/ReceiptSettings'));


const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#F5F2EB' }}>
    <div className="relative">
      <div className="w-16 h-16 border-4 rounded-full animate-spin"
        style={{ borderColor: '#E0D8CC', borderTopColor: '#A97A1F' }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full animate-pulse" style={{ backgroundColor: '#A97A1F' }} />
      </div>
    </div>
    <p className="mt-4 font-semibold text-lg" style={{ color: '#4A4A4A' }}>Loading...</p>
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* PROTECTED ROUTES */}
        <Route element={<PrivateRoute />}>
          <Route element={<DashboardLayout />}>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* POS */}
            <Route element={<PrivateRoute requiredResource="pos" />}>
              <Route path="/pos" element={<POSTerminal />} />
              <Route path="/pos/cart" element={<POSCart />} />
              <Route path="/pos/suspended" element={<POSSuspendedTickets />} />
              <Route path="/pos/refund" element={<POSRefund />} />
              <Route path="/pos/cash-drawer" element={<POSCashDrawer />} />
              <Route path="/pos/reports" element={<POSReports />} />
            </Route>

            {/* BOOKINGS */}
            <Route element={<PrivateRoute requiredResource="bookings" />}>
              <Route path="/bookings" element={<BookingList />} />
              <Route path="/bookings/create" element={<BookingCreate />} />
              <Route path="/bookings/:id" element={<BookingDetail />} />
              <Route path="/bookings/edit/:id" element={<BookingEdit />} />
              <Route path="/bookings/calendar" element={<BookingCalendar />} />
              <Route path="/bookings/:id/cancel" element={<BookingCancel />} />
              <Route path="/bookings/:id/postpone" element={<BookingPostpone />} />
              <Route path="/bookings/:id/contract" element={<BookingContract />} />
              <Route path="/bookings/:id/quotation" element={<BookingQuotation />} />
            </Route>

            {/* CUSTOMERS */}
            <Route element={<PrivateRoute requiredResource="customers" />}>
              <Route path="/customers" element={<CustomerList />} />
              <Route path="/customers/add" element={<CustomerCreate />} />
              <Route path="/customers/edit/:id" element={<CustomerCreate />} />
            </Route>

            {/* EVENTS */}
            <Route element={<PrivateRoute requiredResource="events" />}>
              <Route path="/events" element={<EventList />} />
              <Route path="/events/add" element={<EventAdd />} />
              <Route path="/events/:id/costing" element={<EventCosting />} />
              <Route path="/events/:id/inventory" element={<EventInventoryAllocation />} />
              <Route path="/events/:id/staffing" element={<EventStaffing />} />
              <Route path="/events/:id/timeline" element={<EventTimeline />} />
            </Route>

            {/* SERVICES */}
            <Route element={<PrivateRoute requiredResource="services" />}>
              <Route path="/serviceslist" element={<ServicesList />} />
            </Route>

            {/* INVENTORY */}
            <Route element={<PrivateRoute requiredResource="inventory" />}>
              <Route path="/inventory" element={<StockList />} />
              <Route path="/inventory/item-master" element={<ItemMaster />} />
              <Route path="/inventory/stock-transfer" element={<StockTransfer />} />
              <Route path="/inventory/stock-adjustment" element={<StockAdjustment />} />
              <Route path="/inventory/central-kitchen-transfer" element={<CentralKitchenTransfer />} />
              <Route path="/inventory/wastage-report" element={<WastageReport />} />
            </Route>

            {/* KITCHEN */}
            <Route element={<PrivateRoute requiredResource="kitchen" />}>
              <Route path="/kitchen" element={<KitchenSheet />} />
              <Route path="/kitchen/kds" element={<KDS />} />
              <Route path="/kitchen/production-plan" element={<ProductionPlan />} />
              <Route path="/kitchen/recipe-manager" element={<RecipeManager />} />
              <Route path="/kitchen/wastage-log" element={<WastageLog />} />
            </Route>

            {/* MENUS */}
            <Route element={<PrivateRoute requiredResource="menus" />}>
              <Route path="/menus" element={<MenuList />} />
              <Route path="/menus/add" element={<MenuAdd />} />
              <Route path="/menus/units" element={<Unit />} />
              <Route path="/menus/categories" element={<CategoryList />} />
              <Route path="/menus/items" element={<ItemList />} />
              <Route path="/menus/packages" element={<Packages />} />
            </Route>

            {/* ACCOUNTS */}
            <Route element={<PrivateRoute requiredResource="accounts" />}>
              <Route path="/Accounts" element={<AccountsList />} />
              <Route path="/Accounts/accountslist" element={<AccountsList />} />
              <Route path="/Accounts/payment-voucher" element={<PaymentVoucher />} />
              <Route path="/Accounts/expense-voucher" element={<ExpenseVoucher />} />
              <Route path="/Accounts/ledger" element={<Ledger />} />
              <Route path="/Accounts/day-book" element={<DayBook />} />
              <Route path="/Accounts/vouchers" element={<VoucherList />} />
            </Route>

            {/* FIXED ASSETS */}
            <Route element={<PrivateRoute requiredResource="fixed_assets" />}>
              <Route path="/fixed-assets" element={<AddAssets />} />
              <Route path="/fixed-assets/adjustments" element={<AssetAdjustments />} />
            </Route>

            {/* PROCUREMENT */}
            <Route element={<PrivateRoute requiredResource="procurement" />}>
              <Route path="/procurement/suppliers" element={<SupplierForm />} />
              <Route path="/procurement/suppliers/:id/ledger" element={<SupplierLedger />} />
              <Route path="/procurement/purchase-orders" element={<PurchaseOrderList />} />
              <Route path="/procurement/purchase-orders/create" element={<PurchaseOrderCreate />} />
              <Route path="/procurement/grn" element={<GoodsReceivedNote />} />
              <Route path="/procurement/purchase-return" element={<PurchaseReturn />} />
            </Route>

            {/* HR */}
            <Route element={<PrivateRoute requiredResource="hr" />}>
              <Route path="/hr" element={<StaffList />} />
              <Route path="/hr/employees/add" element={<EmployeeForm />} />
              <Route path="/hr/employees/:id" element={<EmployeeDetail />} />
              <Route path="/hr/attendance" element={<Attendance />} />
              <Route path="/hr/payroll" element={<Payroll />} />
              <Route path="/hr/leave" element={<LeaveManagement />} />
              <Route path="/hr/advance-loan" element={<AdvanceLoan />} />
              <Route path="/hr/event-staff" element={<EventStaffAllocation />} />
              <Route path="/hr/setup" element={<DepartmentDesignationManager />} />
            </Route>

            {/* REPORTS */}
            <Route element={<PrivateRoute requiredResource="reports" />}>
              <Route path="/reports" element={<ReportsLayout />}>
                <Route index element={<ReportsDashboard />} />
                <Route path="bookings" element={<BookingReports />} />
                <Route path="inventory" element={<InventoryReports />} />
                <Route path="hr" element={<HRReports />} />
                <Route path="finance" element={<FinanceReports />} />
                <Route path="kitchenreport" element={<KitchenReport />} />
                <Route path="purchases" element={<PurchaseReports />} />
                <Route path="customerreport" element={<CustomerReport />} />
                <Route path="profit_loss" element={<Profit_Loss />} />
              </Route>
            </Route>

            {/* ADMIN SETTINGS */}
            <Route element={<PrivateRoute allowedRoles={['admin', 'super_admin']} />}>
              <Route path="/settings" element={<Navigate to="/settings/branches" replace />} />
              <Route path="/settings/branches" element={<BranchSettings />} />
              <Route path="/settings/halls" element={<HallSettings />} />
              <Route path="/settings/tax" element={<TaxConfiguration />} />
              <Route path="/settings/roles" element={<RoleManagement />} />
              <Route path="/settings/backup" element={<BackupRestore />} />
              <Route path="/settings/receipt" element={<ReceiptSettings />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F2EB' }}>
                <div className="text-center">
                  <h1 className="text-6xl font-bold mb-4" style={{ color: '#A97A1F' }}>404</h1>
                  <p className="text-xl font-medium" style={{ color: '#4A4A4A' }}>Page Not Found</p>
                  <p className="text-sm mt-2" style={{ color: '#7A7A7A' }}>The page you're looking for doesn't exist.</p>
                </div>
              </div>
            } />

          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;