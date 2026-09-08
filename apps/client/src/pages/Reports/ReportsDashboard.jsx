// src/pages/Reports/ReportsDashboard.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, Users,
  Package, Calendar, Clock, ShoppingCart,
  ArrowUpRight, ArrowDownRight, FileText,
  CreditCard, Wallet, Building2, UserCheck,
  AlertCircle, CheckCircle, XCircle, RefreshCw
} from 'lucide-react';
import { useBranch } from '../../context/BranchContext';
import bookingApi from '../../services/bookingApi';
import inventoryApi from '../../services/inventoryApi';
import employeeApi from '../../services/employeeApi';
import payrollApi from '../../services/payrollApi';
import accountApi from '../../services/accountApi';
import purchaseApi from '../../services/purchaseApi';
import eventExecutionApi from '../../services/eventExecutionApi';
import attendanceApi from '../../services/attendanceApi';

const formatCurrency = (amount) => {
  if (!amount) return 'Rs. 0';
  return `Rs. ${Number(amount).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const ReportsDashboard = () => {
  const navigate = useNavigate();
  const { currentBranch } = useBranch();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchAllStats();
  }, [currentBranch?.id]);

  const fetchAllStats = async () => {
    try {
      setLoading(true);

      // Bookings
      const bookings = await bookingApi.getAll({ limit: 1000 });
      const bookingData = bookings?.data?.data || bookings?.data || [];
      
      // Inventory
      const inventory = await inventoryApi.getAll({ limit: 1000 });
      const invData = inventory?.data?.data || inventory?.data || [];
      
      // Employees
      const employees = await employeeApi.getAll({ status: 'active' });
      const empData = employees?.data?.data || employees?.data || [];
      
      // Payroll
      const payroll = await payrollApi.getAllPayrolls({ limit: 100 });
      const payrollData = payroll?.data?.data || payroll?.data || [];
      
      // Accounts
      const accounts = await accountApi.getAll();
      const accData = accounts?.data?.data || accounts?.data || [];
      
      // Purchases
      const purchases = await purchaseApi.orders.getAll({ limit: 100 });
      const purchData = purchases?.data?.data || purchases?.data || [];
      
      // Events
      const events = await eventExecutionApi.getAll({ limit: 100 });
      const eventData = events?.data?.data || events?.data || [];
      
      // Attendance
      const attendance = await attendanceApi.getAll({ limit: 1000 });
      const attData = attendance?.data?.data || attendance?.data || [];

      setStats({
        bookings: {
          total: bookingData.length,
          confirmed: bookingData.filter(b => b.status === 'confirmed').length,
          completed: bookingData.filter(b => b.status === 'completed').length,
          revenue: bookingData.reduce((s, b) => s + Number(b.totalAmount || 0), 0),
          due: bookingData.reduce((s, b) => s + Number(b.dueAmount || 0), 0),
        },
        inventory: {
          total: invData.length,
          lowStock: invData.filter(i => Number(i.currentStock || 0) <= Number(i.minStock || 0)).length,
          totalValue: invData.reduce((s, i) => s + (Number(i.currentStock || 0) * Number(i.avgCostPrice || 0)), 0),
        },
        employees: {
          total: empData.length,
          active: empData.filter(e => e.status === 'active').length,
        },
        payroll: {
          total: payrollData.length,
          totalSalary: payrollData.reduce((s, p) => s + Number(p.totalNetSalary || 0), 0),
        },
        finance: {
          totalAccounts: accData.length,
          totalBalance: accData.reduce((s, a) => s + Number(a.currentBalance || 0), 0),
        },
        purchases: {
          total: purchData.length,
          totalValue: purchData.reduce((s, p) => s + Number(p.totalAmount || 0), 0),
        },
        events: {
          total: eventData.length,
          inProgress: eventData.filter(e => e.status === 'in_progress').length,
          completed: eventData.filter(e => e.status === 'completed').length,
        },
        attendance: {
          total: attData.length,
          present: attData.filter(a => a.status === 'present').length,
          absent: attData.filter(a => a.status === 'absent').length,
        }
      });
    } catch (err) {
      console.error('❌ Stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  const reportCards = [
    {
      title: 'Bookings',
      value: stats.bookings?.total || 0,
      subValue: `${stats.bookings?.confirmed || 0} Confirmed`,
      icon: Calendar,
      color: '#2563EB',
      bg: '#FEF3C7',
      path: '/reports/bookings'
    },
    {
      title: 'Revenue',
      value: formatCurrency(stats.bookings?.revenue || 0),
      subValue: `Due: ${formatCurrency(stats.bookings?.due || 0)}`,
      icon: TrendingUp,
      color: '#1B5E20',
      bg: '#E8F5E9',
      path: '/reports/bookings'
    },
    {
      title: 'Employees',
      value: stats.employees?.total || 0,
      subValue: `${stats.employees?.active || 0} Active`,
      icon: Users,
      color: '#1565C0',
      bg: '#E3F2FD',
      path: '/reports/hr'
    },
    {
      title: 'Inventory',
      value: stats.inventory?.total || 0,
      subValue: `${stats.inventory?.lowStock || 0} Low Stock`,
      icon: Package,
      color: '#2E7D32',
      bg: '#E8F5E9',
      path: '/reports/inventory'
    },
    {
      title: 'Payroll',
      value: stats.payroll?.total || 0,
      subValue: formatCurrency(stats.payroll?.totalSalary || 0),
      icon: DollarSign,
      color: '#6A1B9A',
      bg: '#F3E5F5',
      path: '/reports/hr'
    },
    {
      title: 'Bank Balance',
      value: formatCurrency(stats.finance?.totalBalance || 0),
      subValue: `${stats.finance?.totalAccounts || 0} Accounts`,
      icon: Building2,
      color: '#00695C',
      bg: '#E0F2F1',
      path: '/reports/finance'
    },
    {
      title: 'Purchases',
      value: stats.purchases?.total || 0,
      subValue: formatCurrency(stats.purchases?.totalValue || 0),
      icon: ShoppingCart,
      color: '#E65100',
      bg: '#FFF3E0',
      path: '/reports/purchases'
    },
    {
      title: 'Events',
      value: stats.events?.total || 0,
      subValue: `${stats.events?.inProgress || 0} In Progress`,
      icon: Clock,
      color: '#6A1B9A',
      bg: '#F3E5F5',
      path: '/reports/events'
    },
    {
      title: 'Attendance',
      value: stats.attendance?.total || 0,
      subValue: `${stats.attendance?.present || 0} Present`,
      icon: UserCheck,
      color: '#2E7D32',
      bg: '#E8F5E9',
      path: '/reports/attendance'
    },
  ];

  return (
    <div className="p-4 md:p-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-7 h-7 text-[#2563EB]" />
            Reports Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete business overview • Updated: {formatDate(new Date())}
          </p>
        </div>
        <button
          onClick={fetchAllStats}
          className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#8A6A1F] transition-colors flex items-center gap-2 shadow-sm text-sm"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* ── Report Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {reportCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              onClick={() => navigate(card.path)}
              className="bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[#2563EB] group"
              style={{ borderColor: '#CBD5E1' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl`} style={{ backgroundColor: card.bg }}>
                  <Icon size={20} style={{ color: card.color }} />
                </div>
                <ArrowUpRight size={16} className="text-gray-300 group-hover:text-[#2563EB] transition-colors" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              <p className="text-sm font-medium text-gray-600 mt-0.5">{card.title}</p>
              <p className="text-xs text-gray-400 mt-1">{card.subValue}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportsDashboard;