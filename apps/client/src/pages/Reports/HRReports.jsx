// pages/HRPayrollAttendanceReports.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Users, ClipboardList, CalendarDays, DollarSign, HandCoins, BookOpen,
  Filter, Download, Printer, RefreshCw, Search, TrendingUp, TrendingDown,
  AlertTriangle, FileText, X, CheckCircle2, Clock, UserCheck, UserX,
  Wallet, Percent, Briefcase, Building2, Phone
} from 'lucide-react';

import employeeApi from '../../services/employeeApi';
import attendanceApi from '../../services/attendanceApi';
import payrollApi from '../../services/payrollApi';
import ReactSelect from '../../components/ui/ReactSelect';

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const formatMoney = (amount) => {
  if (amount == null || isNaN(amount)) return 'PKR 0.00';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const extractArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
  if (res.data?.results && Array.isArray(res.data.results)) return res.data.results;
  return [];
};

const safeStr = (val, fallback = '-') => {
  if (val == null) return fallback;
  if (typeof val === 'object') {
    if (val.name != null) return String(val.name);
    if (val.label != null) return String(val.label);
    if (val.title != null) return String(val.title);
    return JSON.stringify(val);
  }
  return String(val);
};

const safeNum = (val, fallback = 0) => {
  if (val == null) return fallback;
  if (typeof val === 'object') {
    if (val.amount != null) return Number(val.amount) || fallback;
    if (val.value != null) return Number(val.value) || fallback;
    return fallback;
  }
  const n = Number(val);
  return isNaN(n) ? fallback : n;
};

const getStatusColor = (status) => {
  const map = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-600',
    pending: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
    present: 'bg-emerald-100 text-emerald-700',
    absent: 'bg-red-100 text-red-700',
    leave: 'bg-amber-100 text-amber-700',
    half_day: 'bg-orange-100 text-orange-700',
    paid: 'bg-green-100 text-green-700',
    unpaid: 'bg-red-100 text-red-700',
    processed: 'bg-blue-100 text-blue-700',
    generated: 'bg-sky-100 text-sky-700',
    open: 'bg-yellow-100 text-yellow-700',
    closed: 'bg-gray-100 text-gray-600',
  };
  return map[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';
};

// ═══════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════

const StatusBadge = ({ status, label }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
    {label || status}
  </span>
);

const FilterCard = ({ title, icon: Icon, children, onClear, hasFilters }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 print:hidden">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-gray-700">
        {Icon && <Icon size={18} className="text-[#C89B3C]" />}
        <span className="font-semibold text-sm">{title}</span>
      </div>
      {hasFilters && (
        <button onClick={onClear} className="text-xs flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors">
          <X size={14} /> Clear Filters
        </button>
      )}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {children}
    </div>
  </div>
);

const SummaryCard = ({ title, value, icon: Icon, trend, trendUp }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
        <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className="p-2 bg-[#C89B3C]/10 rounded-lg">
        {Icon && <Icon size={20} className="text-[#C89B3C]" />}
      </div>
    </div>
    {trend && (
      <div className="flex items-center gap-1 mt-2">
        {trendUp ? <TrendingUp size={14} className="text-green-500" /> : <TrendingDown size={14} className="text-red-500" />}
        <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>{trend}</span>
      </div>
    )}
  </div>
);

const ExportToolbar = ({ onExportCSV, onExportPDF, onPrint, dataCount }) => (
  <div className="flex items-center justify-between mb-4 print:hidden">
    <p className="text-sm text-gray-500">
      Showing <span className="font-semibold text-gray-700">{dataCount}</span> records
    </p>
    <div className="flex items-center gap-2">
      <button onClick={onExportPDF} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all shadow-sm">
        <FileText size={16} /> PDF
      </button>
      <button onClick={onExportCSV} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-[#C89B3C] transition-all">
        <Download size={16} /> CSV
      </button>
      <button onClick={onPrint} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#C89B3C] rounded-lg hover:bg-[#A97A1F] transition-colors">
        <Printer size={16} /> Print
      </button>
    </div>
  </div>
);

const DataTable = ({ columns, data, keyExtractor, emptyMessage = "No data found", loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <RefreshCw size={32} className="mx-auto text-[#C89B3C] animate-spin mb-3" />
        <p className="text-gray-500">Loading data...</p>
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <FileText size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="px-4 py-3 whitespace-nowrap">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, ri) => (
              <tr key={keyExtractor ? keyExtractor(row, ri) : ri} className="hover:bg-gray-50/50 transition-colors">
                {columns.map((col, ci) => (
                  <td key={ci} className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {col.cell ? col.cell(row) : safeStr(row[col.accessor], '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// DATA NORMALIZATION
// ═══════════════════════════════════════════════════════════

const normalizeEmployee = (item) => ({
  id: safeNum(item.id ?? item._id, 0),
  name: safeStr(item.name ?? item.fullName ?? item.employeeName),
  phone: safeStr(item.phone ?? item.mobile ?? item.contactNumber),
  email: safeStr(item.email),
  department: safeStr(item.department ?? item.departmentName ?? item.dept),
  designation: safeStr(item.designation ?? item.designationName ?? item.role ?? item.jobTitle),
  salary: safeNum(item.salary ?? item.baseSalary ?? item.monthlySalary),
  joiningDate: safeStr(item.joiningDate ?? item.joining_date ?? item.dateOfJoining),
  status: safeStr(item.status, 'active').toLowerCase(),
  branchName: safeStr(item.branchName ?? item.branch_name ?? item.branch),
});

const normalizeAttendance = (item) => ({
  id: safeNum(item.id ?? item._id, 0),
  employeeId: safeNum(item.employeeId ?? item.employee_id ?? item.employee?._id),
  employeeName: safeStr(item.employeeName ?? item.employee_name ?? item.employee?.name ?? item.name),
  date: safeStr(item.date ?? item.attendanceDate ?? item.attendance_date),
  status: safeStr(item.status, 'present').toLowerCase(),
  checkIn: safeStr(item.checkIn ?? item.check_in ?? item.checkinTime, '-'),
  checkOut: safeStr(item.checkOut ?? item.check_out ?? item.checkoutTime, '-'),
  overtime: safeNum(item.overtime ?? item.over_time ?? item.otHours),
  remarks: safeStr(item.remarks ?? item.note ?? item.notes, '-'),
});

const normalizeLeave = (item) => ({
  id: safeNum(item.id ?? item._id, 0),
  employeeId: safeNum(item.employeeId ?? item.employee_id ?? item.employee?._id),
  employeeName: safeStr(item.employeeName ?? item.employee_name ?? item.employee?.name ?? item.name),
  leaveType: safeStr(item.leaveType ?? item.leave_type ?? item.type),
  fromDate: safeStr(item.fromDate ?? item.from_date ?? item.startDate),
  toDate: safeStr(item.toDate ?? item.to_date ?? item.endDate),
  days: safeNum(item.days ?? item.totalDays ?? item.total_days, 1),
  status: safeStr(item.status, 'pending').toLowerCase(),
  reason: safeStr(item.reason ?? item.purpose ?? item.notes, '-'),
});

// ═══════════════════════════════════════════════════════════
// FIX: PAYROLL NORMALIZATION — Handles multiple API formats
// ═══════════════════════════════════════════════════════════

const resolveEmployeeName = (item) => {
  if (!item) return null;
  // Direct string fields
  const candidates = [
    item.employeeName,
    item.employee_name,
    item.staffName,
    item.staff_name,
    item.fullName,
    item.full_name,
    item.name,
  ];
  for (const c of candidates) {
    if (c != null && typeof c === 'string' && c.trim()) return c.trim();
  }
  // Nested employee / staff / user object
  const emp = item.employee || item.staff || item.user || item.employeeId;
  if (emp && typeof emp === 'object') {
    const nested = [
      emp.name,
      emp.fullName,
      emp.full_name,
      emp.employeeName,
      emp.staffName,
      emp.firstName && emp.lastName ? `${emp.firstName} ${emp.lastName}` : null,
      emp.firstName,
      emp.username,
    ];
    for (const n of nested) {
      if (n != null && String(n).trim()) return String(n).trim();
    }
  }
  return null;
};

const formatPayrollMonth = (monthVal, yearVal) => {
  if (!monthVal && monthVal !== 0) return '-';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let monthNum = Number(monthVal);
  let yearNum = Number(yearVal);

  // Already formatted string like "Aug 2026" or "August 2026"
  if (typeof monthVal === 'string') {
    const m = monthVal.trim();
    if (m.length > 4 && /\d{4}/.test(m)) return m;
    // Parse "2026-08" format
    const isoMatch = m.match(/^(\d{4})-(\d{2})$/);
    if (isoMatch) {
      monthNum = parseInt(isoMatch[2], 10);
      yearNum = parseInt(isoMatch[1], 10);
    }
  }

  if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
    const y = !isNaN(yearNum) && yearNum > 2000 ? yearNum : new Date().getFullYear();
    return `${months[monthNum - 1]} ${y}`;
  }
  return String(monthVal);
};

const normalizePayroll = (item) => {
  if (!item) return {};

  // Extract numeric salary from multiple possible field names
  const extractSalary = (...keys) => {
    for (const k of keys) {
      const v = item[k];
      if (v != null) {
        if (typeof v === 'number') return v;
        if (typeof v === 'string' && v.trim() !== '') {
          const n = Number(v.replace(/,/g, ''));
          if (!isNaN(n)) return n;
        }
        if (typeof v === 'object') {
          if (v.amount != null) return Number(v.amount) || 0;
          if (v.value != null) return Number(v.value) || 0;
        }
      }
    }
    return 0;
  };

  const baseSalary = extractSalary('baseSalary', 'base_salary', 'basic', 'basicSalary', 'salary', 'amount', 'monthlySalary');
  const deductions = extractSalary('deductions', 'totalDeductions', 'total_deductions', 'tax', 'providentFund', 'pf', 'advanceDeduction');
  const bonus = extractSalary('bonus', 'totalBonus', 'total_bonus', 'incentives', 'allowances', 'extraPay');

  // Use explicit netSalary if available, otherwise auto-calculate
  let netSalary = extractSalary('netSalary', 'net_salary', 'net', 'totalNet', 'payableAmount', 'totalPayable');
  if ((!netSalary || netSalary === 0) && (baseSalary || deductions || bonus)) {
    netSalary = baseSalary - deductions + bonus;
  }

  const rawMonth = item.month ?? item.payrollMonth ?? item.payroll_month ?? item.salaryMonth ?? item.salary_month;
  const rawYear = item.year ?? item.payrollYear ?? item.salaryYear;
  const month = formatPayrollMonth(rawMonth, rawYear);

  return {
    id: safeNum(item.id ?? item._id, 0),
    employeeId: safeNum(item.employeeId ?? item.employee_id ?? item.employee?._id ?? item.staffId ?? item.staff_id),
    employeeName: resolveEmployeeName(item) || '-',
    month,
    baseSalary,
    deductions,
    bonus,
    netSalary,
    status: safeStr(item.status, 'generated').toLowerCase(),
    paymentDate: safeStr(item.paymentDate ?? item.payment_date ?? item.paidDate ?? item.paidAt),
  };
};

const normalizeLoan = (item) => ({
  id: safeNum(item.id ?? item._id, 0),
  employeeId: safeNum(item.employeeId ?? item.employee_id ?? item.employee?._id),
  employeeName: safeStr(item.employeeName ?? item.employee_name ?? item.employee?.name ?? item.name),
  amount: safeNum(item.amount ?? item.loanAmount ?? item.loan_amount ?? item.principal),
  paidAmount: safeNum(item.paidAmount ?? item.paid_amount ?? item.paid ?? item.amountPaid),
  remaining: safeNum(item.remaining ?? item.remainingAmount ?? item.balance),
  status: safeStr(item.status, 'open').toLowerCase(),
  issuedDate: safeStr(item.issuedDate ?? item.issued_date ?? item.issueDate ?? item.createdAt),
  installment: safeNum(item.installment ?? item.monthlyInstallment ?? item.monthly_installment),
  type: safeStr(item.type ?? item.loanType, 'loan'),
});

const normalizeEventStaff = (item) => ({
  id: safeNum(item.id ?? item._id, 0),
  employeeId: safeNum(item.employeeId ?? item.employee_id ?? item.employee?._id),
  employeeName: safeStr(item.employeeName ?? item.employee_name ?? item.employee?.name ?? item.name),
  eventName: safeStr(item.eventName ?? item.event_name ?? item.event?.name ?? item.event),
  role: safeStr(item.role ?? item.staffRole ?? item.assignedRole ?? item.position),
  assignedDate: safeStr(item.assignedDate ?? item.assigned_date ?? item.assignmentDate ?? item.date),
  payment: safeNum(item.payment ?? item.staffPayment ?? item.eventPayment ?? item.amount),
  attendance: safeStr(item.attendance, 'present').toLowerCase(),
  status: safeStr(item.status, 'pending').toLowerCase(),
});

const normalizeLedger = (item) => ({
  id: safeNum(item.id ?? item._id, 0),
  employeeId: safeNum(item.employeeId ?? item.employee_id ?? item.employee?._id),
  employeeName: safeStr(item.employeeName ?? item.employee_name ?? item.employee?.name ?? item.name),
  transactionType: safeStr(item.transactionType ?? item.transaction_type ?? item.type),
  amount: safeNum(item.amount ?? item.transactionAmount ?? item.credit ?? item.debit),
  balance: safeNum(item.balance ?? item.runningBalance ?? item.currentBalance),
  date: safeStr(item.date ?? item.transactionDate ?? item.transaction_date ?? item.createdAt),
  description: safeStr(item.description ?? item.note ?? item.remarks ?? item.notes, '-'),
});

// ═══════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════

const genMockEmployees = () => {
  const depts = ['Kitchen','Service','Management','Security','Cleaning','Decoration'];
  const desigs = ['Chef','Waiter','Manager','Guard','Supervisor','Helper'];
  const data = [];
  for (let i = 1; i <= 25; i++) {
    data.push({
      id: i, name: `Employee ${i}`, phone: `03${Math.floor(Math.random()*900000000+100000000)}`,
      email: `emp${i}@raath.com`, department: depts[Math.floor(Math.random()*depts.length)],
      designation: desigs[Math.floor(Math.random()*desigs.length)],
      salary: Math.floor(Math.random()*80000)+25000,
      joiningDate: `202${Math.floor(Math.random()*4)+2}-0${Math.floor(Math.random()*9)+1}-${String(Math.floor(Math.random()*28)+1).padStart(2,'0')}`,
      status: Math.random() > 0.1 ? 'active' : 'inactive',
      branchName: ['Main Branch','Gulshan','DHA'][Math.floor(Math.random()*3)],
    });
  }
  return data;
};

const genMockAttendance = () => {
  const data = [];
  for (let i = 1; i <= 30; i++) {
    data.push({
      id: i, employeeId: Math.floor(Math.random()*25)+1,
      employeeName: `Employee ${Math.floor(Math.random()*25)+1}`,
      date: `2026-08-${String(Math.floor(Math.random()*30)+1).padStart(2,'0')}`,
      status: ['present','absent','leave','half_day'][Math.floor(Math.random()*4)],
      checkIn: '09:00', checkOut: '18:00', overtime: Math.floor(Math.random()*3), remarks: '-'
    });
  }
  return data;
};

const genMockLeaves = () => {
  const types = ['annual','sick','casual','unpaid'];
  const data = [];
  for (let i = 1; i <= 20; i++) {
    data.push({
      id: i, employeeId: Math.floor(Math.random()*25)+1,
      employeeName: `Employee ${Math.floor(Math.random()*25)+1}`,
      leaveType: types[Math.floor(Math.random()*types.length)],
      fromDate: `2026-0${Math.floor(Math.random()*8)+1}-${String(Math.floor(Math.random()*28)+1).padStart(2,'0')}`,
      toDate: `2026-0${Math.floor(Math.random()*8)+1}-${String(Math.floor(Math.random()*28)+1).padStart(2,'0')}`,
      days: Math.floor(Math.random()*5)+1,
      status: ['approved','pending','rejected'][Math.floor(Math.random()*3)],
      reason: 'Personal work'
    });
  }
  return data;
};

const genMockPayrolls = () => {
  const data = [];
  for (let i = 1; i <= 20; i++) {
    const base = Math.floor(Math.random()*80000)+30000;
    const deductions = Math.floor(base*0.1);
    const bonus = Math.floor(Math.random()*5000);
    data.push({
      id: i, employeeId: Math.floor(Math.random()*25)+1,
      employeeName: `Employee ${Math.floor(Math.random()*25)+1}`,
      month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Math.floor(Math.random()*12)] + ' 2026',
      baseSalary: base, deductions, bonus,
      netSalary: base - deductions + bonus,
      status: ['generated','processed','paid'][Math.floor(Math.random()*3)],
      paymentDate: `2026-0${Math.floor(Math.random()*8)+1}-05`,
    });
  }
  return data;
};

const genMockLoans = () => {
  const data = [];
  for (let i = 1; i <= 15; i++) {
    const amount = Math.floor(Math.random()*100000)+10000;
    const paid = Math.floor(amount*(Math.random()*0.7));
    data.push({
      id: i, employeeId: Math.floor(Math.random()*25)+1,
      employeeName: `Employee ${Math.floor(Math.random()*25)+1}`,
      amount, paidAmount: paid, remaining: amount - paid,
      status: paid >= amount ? 'closed' : 'open',
      issuedDate: `2026-0${Math.floor(Math.random()*6)+1}-15`,
      installment: Math.floor(amount/10), type: 'loan'
    });
  }
  return data;
};

const genMockEventStaff = () => {
  const roles = ['Waiter','Chef','Guard','Decorator','Supervisor','Cleaner'];
  const data = [];
  for (let i = 1; i <= 20; i++) {
    data.push({
      id: i, employeeId: Math.floor(Math.random()*25)+1,
      employeeName: `Employee ${Math.floor(Math.random()*25)+1}`,
      eventName: `Event ${Math.floor(Math.random()*50)+1}`,
      role: roles[Math.floor(Math.random()*roles.length)],
      assignedDate: `2026-08-${String(Math.floor(Math.random()*30)+1).padStart(2,'0')}`,
      payment: Math.floor(Math.random()*8000)+2000,
      attendance: ['present','absent'][Math.floor(Math.random()*2)],
      status: ['paid','pending'][Math.floor(Math.random()*2)],
    });
  }
  return data;
};

const genMockLedger = () => {
  const types = ['salary','loan','advance','bonus','deduction'];
  const data = [];
  for (let i = 1; i <= 30; i++) {
    data.push({
      id: i, employeeId: Math.floor(Math.random()*25)+1,
      employeeName: `Employee ${Math.floor(Math.random()*25)+1}`,
      transactionType: types[Math.floor(Math.random()*types.length)],
      amount: Math.floor(Math.random()*50000)+5000,
      balance: Math.floor(Math.random()*100000)-20000,
      date: `2026-08-${String(Math.floor(Math.random()*30)+1).padStart(2,'0')}`,
      description: 'Transaction entry',
    });
  }
  return data;
};

const TABS = [
  { id: 'employees', label: 'Employee Directory', icon: Users },
  { id: 'attendance', label: 'Attendance Report', icon: ClipboardList },
  { id: 'leaves', label: 'Leave Balance', icon: CalendarDays },
  { id: 'payroll', label: 'Payroll Summary', icon: DollarSign },
  { id: 'loans', label: 'Loan & Advance', icon: HandCoins },
  { id: 'eventStaff', label: 'Event Staff', icon: Users },
  { id: 'ledger', label: 'Staff Ledger', icon: BookOpen },
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function HRPayrollAttendanceReports() {
  const [activeTab, setActiveTab] = useState('employees');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loans, setLoans] = useState([]);
  const [eventStaff, setEventStaff] = useState([]);
  const [ledger, setLedger] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [role, setRole] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');

  // Employee dropdown options derived from employees state
  const employeeOptions = useMemo(() => {
    const names = [...new Set(employees.map(e => e.name).filter(Boolean))].sort();
    return [{ value: '', label: 'All Employees' }, ...names.map(n => ({ value: n, label: n }))];
  }, [employees]);

  useEffect(() => {
    setSearch(''); setDateFrom(''); setDateTo(''); setStatus('');
    setDepartment(''); setDesignation(''); setLeaveType('');
    setTransactionType(''); setRole(''); setEmployeeFilter('');
    setError(null);
  }, [activeTab]);

  const fetchAllData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let empData = [];
      try { empData = extractArray(await employeeApi.getAll()).map(normalizeEmployee); }
      catch (e) { empData = genMockEmployees(); }
      setEmployees(empData);

      let attData = [];
      try { attData = extractArray(await attendanceApi.getAll()).map(normalizeAttendance); }
      catch (e) { attData = genMockAttendance(); }
      setAttendance(attData);

      let leaveData = [];
      try { leaveData = extractArray(await attendanceApi.getAllLeaves()).map(normalizeLeave); }
      catch (e) { leaveData = genMockLeaves(); }
      setLeaves(leaveData);

      let payrollData = [];
      try {
        const res = await payrollApi.getAllPayrolls();
        payrollData = extractArray(res).map(normalizePayroll);
        console.log('RAW PAYROLL:', res);
        console.log('NORMALIZED PAYROLL:', payrollData);
      }
      catch (e) { payrollData = genMockPayrolls(); }
      setPayrolls(payrollData);

      let loanData = [];
      try { loanData = extractArray(await payrollApi.getAllLoans()).map(normalizeLoan); }
      catch (e) { loanData = genMockLoans(); }
      setLoans(loanData);

      let staffData = [];
      try { staffData = extractArray(await payrollApi.getAllEventAssignments()).map(normalizeEventStaff); }
      catch (e) { staffData = genMockEventStaff(); }
      setEventStaff(staffData);

      let ledgerData = [];
      try { ledgerData = extractArray(await payrollApi.getStaffLedger()).map(normalizeLedger); }
      catch (e) { ledgerData = genMockLedger(); }
      setLedger(ledgerData);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const getCurrentData = () => {
    switch (activeTab) {
      case 'employees': return employees;
      case 'attendance': return attendance;
      case 'leaves': return leaves;
      case 'payroll': return payrolls;
      case 'loans': return loans;
      case 'eventStaff': return eventStaff;
      case 'ledger': return ledger;
      default: return [];
    }
  };

  const downloadPDF = useCallback(() => {
    const currentData = getCurrentData();
    if (!currentData.length) return;
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor = [169, 122, 31];

    doc.setFillColor(245, 242, 235);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text('UniSoft ERP', 14, 14);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('HR, Payroll & Attendance Reports', 14, 21);

    const tabLabel = TABS.find(t => t.id === activeTab)?.label || 'Report';
    doc.setFontSize(14);
    doc.setTextColor(26, 26, 26);
    doc.text(tabLabel.toUpperCase(), pageWidth / 2, 12, { align: 'center' });

    const now = new Date().toLocaleString('en-GB');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${now}`, pageWidth - 14, 12, { align: 'right' });
    if (dateFrom && dateTo) {
      doc.text(`Period: ${dateFrom} to ${dateTo}`, pageWidth - 14, 18, { align: 'right' });
    }

    let headers = [], body = [];
    switch (activeTab) {
      case 'employees':
        headers = [['ID','Name','Department','Designation','Salary','Phone','Status','Branch']];
        body = currentData.map(r => [String(r.id||''), r.name||'', r.department||'', r.designation||'', String(r.salary||0), r.phone||'', r.status||'active', r.branchName||'']);
        break;
      case 'attendance':
        headers = [['Date','Employee','Status','Check In','Check Out','OT (hrs)','Remarks']];
        body = currentData.map(r => [formatDateShort(r.date), r.employeeName||'', r.status||'', r.checkIn||'-', r.checkOut||'-', String(r.overtime||0), r.remarks||'']);
        break;
      case 'leaves':
        headers = [['Employee','Type','From','To','Days','Status','Reason']];
        body = currentData.map(r => [r.employeeName||'', r.leaveType||'', formatDateShort(r.fromDate), formatDateShort(r.toDate), String(r.days||0), r.status||'', r.reason||'']);
        break;
      case 'payroll':
        headers = [['Employee','Month','Base Salary','Deductions','Bonus','Net Salary','Status','Payment Date']];
        body = currentData.map(r => [r.employeeName||'', r.month||'', String(r.baseSalary||0), String(r.deductions||0), String(r.bonus||0), String(r.netSalary||0), r.status||'', formatDateShort(r.paymentDate)]);
        break;
      case 'loans':
        headers = [['Employee','Amount','Paid','Remaining','Installment','Status','Issued Date']];
        body = currentData.map(r => [r.employeeName||'', String(r.amount||0), String(r.paidAmount||0), String(r.remaining||0), String(r.installment||0), r.status||'', formatDateShort(r.issuedDate)]);
        break;
      case 'eventStaff':
        headers = [['Employee','Event','Role','Assigned Date','Payment','Attendance','Status']];
        body = currentData.map(r => [r.employeeName||'', r.eventName||'', r.role||'', formatDateShort(r.assignedDate), String(r.payment||0), r.attendance||'', r.status||'']);
        break;
      case 'ledger':
        headers = [['Date','Employee','Type','Amount','Balance','Description']];
        body = currentData.map(r => [formatDateShort(r.date), r.employeeName||'', r.transactionType||'', String(r.amount||0), String(r.balance||0), r.description||'']);
        break;
      default:
        headers = [['Data']];
        body = currentData.map(r => [JSON.stringify(r)]);
    }

    autoTable(doc, {
      startY: 36, head: headers, body: body,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica' },
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 248, 245] },
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`© 2026 UniSoft ERP — Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
    doc.save(`HR_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
  }, [activeTab, dateFrom, dateTo, employees, attendance, leaves, payrolls, loans, eventStaff, ledger]);

  const downloadCSV = useCallback(() => {
    const currentData = getCurrentData();
    if (!currentData.length) return;
    let headers = [], rows = [];
    switch (activeTab) {
      case 'employees':
        headers = ['ID','Name','Department','Designation','Salary','Phone','Email','Joining Date','Status','Branch'];
        rows = currentData.map(r => [r.id, r.name, r.department, r.designation, r.salary, r.phone, r.email, r.joiningDate, r.status, r.branchName]);
        break;
      case 'attendance':
        headers = ['ID','Employee','Date','Status','Check In','Check Out','Overtime','Remarks'];
        rows = currentData.map(r => [r.id, r.employeeName, r.date, r.status, r.checkIn, r.checkOut, r.overtime, r.remarks]);
        break;
      case 'leaves':
        headers = ['ID','Employee','Leave Type','From','To','Days','Status','Reason'];
        rows = currentData.map(r => [r.id, r.employeeName, r.leaveType, r.fromDate, r.toDate, r.days, r.status, r.reason]);
        break;
      case 'payroll':
        headers = ['ID','Employee','Month','Base Salary','Deductions','Bonus','Net Salary','Status','Payment Date'];
        rows = currentData.map(r => [r.id, r.employeeName, r.month, r.baseSalary, r.deductions, r.bonus, r.netSalary, r.status, r.paymentDate]);
        break;
      case 'loans':
        headers = ['ID','Employee','Amount','Paid Amount','Remaining','Installment','Status','Issued Date'];
        rows = currentData.map(r => [r.id, r.employeeName, r.amount, r.paidAmount, r.remaining, r.installment, r.status, r.issuedDate]);
        break;
      case 'eventStaff':
        headers = ['ID','Employee','Event','Role','Assigned Date','Payment','Attendance','Status'];
        rows = currentData.map(r => [r.id, r.employeeName, r.eventName, r.role, r.assignedDate, r.payment, r.attendance, r.status]);
        break;
      case 'ledger':
        headers = ['ID','Employee','Transaction Type','Amount','Balance','Date','Description'];
        rows = currentData.map(r => [r.id, r.employeeName, r.transactionType, r.amount, r.balance, r.date, r.description]);
        break;
      default:
        headers = Object.keys(currentData[0]);
        rows = currentData.map(r => Object.values(r));
    }
    const csvContent = [
      ['UniSoft ERP - HR, Payroll & Attendance Report'],
      [`Report: ${TABS.find(t => t.id === activeTab)?.label}`],
      [`Generated: ${new Date().toLocaleString('en-GB')}`],
      dateFrom && dateTo ? [`Period: ${dateFrom} to ${dateTo}`] : [],
      [], headers, ...rows
    ].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `HR_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [activeTab, dateFrom, dateTo, employees, attendance, leaves, payrolls, loans, eventStaff, ledger]);

  const handlePrint = () => window.print();

  const hasActiveFilters = search || dateFrom || dateTo || status || department || designation || leaveType || transactionType || role || employeeFilter;
  const clearFilters = () => {
    setSearch(''); setDateFrom(''); setDateTo(''); setStatus('');
    setDepartment(''); setDesignation(''); setLeaveType('');
    setTransactionType(''); setRole(''); setEmployeeFilter('');
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER: TAB CONTENT
  // ═══════════════════════════════════════════════════════════

  const renderEmployees = () => {
    const filtered = employees.filter(item => {
      if (employeeFilter && item.name !== employeeFilter) return false;
      if (status && item.status !== status) return false;
      if (department && item.department !== department) return false;
      if (designation && item.designation !== designation) return false;
      return true;
    });

    const totalItems = filtered.length;
    const activeCount = filtered.filter(i => i.status === 'active').length;
    const totalSalary = filtered.reduce((sum, i) => sum + (Number(i.salary) || 0), 0);
    const depts = [...new Set(employees.map(e => e.department).filter(Boolean))];
    const desigs = [...new Set(employees.map(e => e.designation).filter(Boolean))];

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Employees" value={totalItems} icon={Users} />
          <SummaryCard title="Active Staff" value={activeCount} icon={UserCheck} trend="Working" trendUp={true} />
          <SummaryCard title="Total Salary" value={formatMoney(totalSalary)} icon={DollarSign} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <ReactSelect
            value={employeeFilter}
            onChange={(val) => setEmployeeFilter(val || '')}
            options={employeeOptions}
            placeholder="All Employees"
            isSearchable={true}
            isClearable={false}
          />
          <ReactSelect
            value={status}
            onChange={(val) => setStatus(val || '')}
            options={[{ value: '', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
            placeholder="All Status"
            isSearchable={false}
            isClearable={false}
          />
          <ReactSelect
            value={department}
            onChange={(val) => setDepartment(val || '')}
            options={[{ value: '', label: 'All Departments' }, ...depts.map(d => ({ value: d, label: d }))]}
            placeholder="All Departments"
            isSearchable={false}
            isClearable={false}
          />
          <ReactSelect
            value={designation}
            onChange={(val) => setDesignation(val || '')}
            options={[{ value: '', label: 'All Designations' }, ...desigs.map(d => ({ value: d, label: d }))]}
            placeholder="All Designations"
            isSearchable={false}
            isClearable={false}
          />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id}
          emptyMessage="No employees found"
          columns={[
            { header: 'ID', accessor: 'id', cell: row => <span className="font-semibold text-gray-900">#{row.id}</span> },
            { header: 'Name', accessor: 'name', cell: row => (
              <div>
                <div className="font-medium text-gray-900">{row.name}</div>
                <div className="flex items-center gap-1 text-xs text-gray-400"><Phone size={12} /> {row.phone}</div>
              </div>
            )},
            { header: 'Department', accessor: 'department' },
            { header: 'Designation', accessor: 'designation' },
            { header: 'Salary', accessor: 'salary', cell: row => <span className="font-semibold text-gray-900">{(row.salary || 0).toLocaleString()}</span> },
            { header: 'Joining Date', accessor: 'joiningDate', cell: row => formatDateShort(row.joiningDate) },
            { header: 'Status', accessor: 'status', cell: row => <StatusBadge status={row.status} label={row.status?.toUpperCase()} /> },
            { header: 'Branch', accessor: 'branchName' },
          ]}
        />
      </>
    );
  };

  const renderAttendance = () => {
    const filtered = attendance.filter(item => {
      if (employeeFilter && item.employeeName !== employeeFilter) return false;
      if (status && item.status !== status) return false;
      if (dateFrom && item.date && item.date < dateFrom) return false;
      if (dateTo && item.date && item.date > dateTo) return false;
      return true;
    });

    const total = filtered.length;
    const present = filtered.filter(i => i.status === 'present').length;
    const absent = filtered.filter(i => i.status === 'absent').length;

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Records" value={total} icon={ClipboardList} />
          <SummaryCard title="Present" value={present} icon={UserCheck} trend="On Duty" trendUp={true} />
          <SummaryCard title="Absent" value={absent} icon={UserX} trend="Missing" trendUp={false} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <ReactSelect
            value={employeeFilter}
            onChange={(val) => setEmployeeFilter(val || '')}
            options={employeeOptions}
            placeholder="All Employees"
            isSearchable={true}
            isClearable={false}
          />
          <ReactSelect
            value={status}
            onChange={(val) => setStatus(val || '')}
            options={[{ value: '', label: 'All Status' }, { value: 'present', label: 'Present' }, { value: 'absent', label: 'Absent' }, { value: 'leave', label: 'Leave' }, { value: 'half_day', label: 'Half Day' }]}
            placeholder="All Status"
            isSearchable={false}
            isClearable={false}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" placeholder="From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" placeholder="To" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id}
          emptyMessage="No attendance records found"
          columns={[
            { header: 'ID', accessor: 'id', cell: row => <span className="font-semibold text-gray-900">#{row.id}</span> },
            { header: 'Employee', accessor: 'employeeName' },
            { header: 'Date', accessor: 'date', cell: row => formatDateShort(row.date) },
            { header: 'Status', accessor: 'status', cell: row => <StatusBadge status={row.status} label={row.status?.toUpperCase()} /> },
            { header: 'Check In', accessor: 'checkIn' },
            { header: 'Check Out', accessor: 'checkOut' },
            { header: 'OT (hrs)', accessor: 'overtime', cell: row => <span className="text-amber-600 font-semibold">{row.overtime}</span> },
            { header: 'Remarks', accessor: 'remarks' },
          ]}
        />
      </>
    );
  };

  const renderLeaves = () => {
    const filtered = leaves.filter(item => {
      if (employeeFilter && item.employeeName !== employeeFilter) return false;
      if (status && item.status !== status) return false;
      if (leaveType && item.leaveType !== leaveType) return false;
      if (dateFrom && item.fromDate && item.fromDate < dateFrom) return false;
      if (dateTo && item.toDate && item.toDate > dateTo) return false;
      return true;
    });

    const total = filtered.length;
    const approved = filtered.filter(i => i.status === 'approved').length;
    const pending = filtered.filter(i => i.status === 'pending').length;
    const types = [...new Set(leaves.map(l => l.leaveType).filter(Boolean))];

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Requests" value={total} icon={ClipboardList} />
          <SummaryCard title="Approved" value={approved} icon={CheckCircle2} trend="Granted" trendUp={true} />
          <SummaryCard title="Pending" value={pending} icon={Clock} trend="Waiting" trendUp={false} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <ReactSelect
            value={employeeFilter}
            onChange={(val) => setEmployeeFilter(val || '')}
            options={employeeOptions}
            placeholder="All Employees"
            isSearchable={true}
            isClearable={false}
          />
          <ReactSelect
            value={status}
            onChange={(val) => setStatus(val || '')}
            options={[{ value: '', label: 'All Status' }, { value: 'approved', label: 'Approved' }, { value: 'pending', label: 'Pending' }, { value: 'rejected', label: 'Rejected' }]}
            placeholder="All Status"
            isSearchable={false}
            isClearable={false}
          />
          <ReactSelect
            value={leaveType}
            onChange={(val) => setLeaveType(val || '')}
            options={[{ value: '', label: 'All Types' }, ...types.map(t => ({ value: t, label: t.toUpperCase() }))]}
            placeholder="All Types"
            isSearchable={false}
            isClearable={false}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" placeholder="From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" placeholder="To" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id}
          emptyMessage="No leave records found"
          columns={[
            { header: 'ID', accessor: 'id', cell: row => <span className="font-semibold text-gray-900">#{row.id}</span> },
            { header: 'Employee', accessor: 'employeeName' },
            { header: 'Type', accessor: 'leaveType', cell: row => <span className="uppercase text-xs font-semibold text-gray-600">{row.leaveType}</span> },
            { header: 'From', accessor: 'fromDate', cell: row => formatDateShort(row.fromDate) },
            { header: 'To', accessor: 'toDate', cell: row => formatDateShort(row.toDate) },
            { header: 'Days', accessor: 'days', cell: row => <span className="font-bold text-gray-900">{row.days}</span> },
            { header: 'Status', accessor: 'status', cell: row => <StatusBadge status={row.status} label={row.status?.toUpperCase()} /> },
            { header: 'Reason', accessor: 'reason' },
          ]}
        />
      </>
    );
  };

  const renderPayroll = () => {
    const filtered = payrolls.filter(item => {
      if (employeeFilter && item.employeeName !== employeeFilter) return false;
      if (status && item.status !== status) return false;
      if (dateFrom && item.paymentDate && item.paymentDate < dateFrom) return false;
      if (dateTo && item.paymentDate && item.paymentDate > dateTo) return false;
      return true;
    });

    const total = filtered.length;
    const totalNet = filtered.reduce((sum, i) => sum + (Number(i.netSalary) || 0), 0);
    const paidCount = filtered.filter(i => i.status === 'paid').length;

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Records" value={total} icon={ClipboardList} />
          <SummaryCard title="Net Payout" value={formatMoney(totalNet)} icon={Wallet} />
          <SummaryCard title="Paid" value={paidCount} icon={CheckCircle2} trend="Disbursed" trendUp={true} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <ReactSelect
            value={employeeFilter}
            onChange={(val) => setEmployeeFilter(val || '')}
            options={employeeOptions}
            placeholder="All Employees"
            isSearchable={true}
            isClearable={false}
          />
          <ReactSelect
            value={status}
            onChange={(val) => setStatus(val || '')}
            options={[{ value: '', label: 'All Status' }, { value: 'paid', label: 'Paid' }, { value: 'processed', label: 'Processed' }, { value: 'generated', label: 'Generated' }]}
            placeholder="All Status"
            isSearchable={false}
            isClearable={false}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" placeholder="From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" placeholder="To" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id}
          emptyMessage="No payroll records found"
          columns={[
            { header: 'ID', accessor: 'id', cell: row => <span className="font-semibold text-gray-900">#{row.id}</span> },
            { header: 'Employee', accessor: 'employeeName' },
            { header: 'Month', accessor: 'month' },
            { header: 'Base Salary', accessor: 'baseSalary', cell: row => (row.baseSalary || 0).toLocaleString() },
            { header: 'Deductions', accessor: 'deductions', cell: row => <span className="text-red-600">{(row.deductions || 0).toLocaleString()}</span> },
            { header: 'Bonus', accessor: 'bonus', cell: row => <span className="text-emerald-600">{(row.bonus || 0).toLocaleString()}</span> },
            { header: 'Net Salary', accessor: 'netSalary', cell: row => <span className="font-bold text-gray-900">{(row.netSalary || 0).toLocaleString()}</span> },
            { header: 'Status', accessor: 'status', cell: row => <StatusBadge status={row.status} label={row.status?.toUpperCase()} /> },
            { header: 'Payment Date', accessor: 'paymentDate', cell: row => formatDateShort(row.paymentDate) },
          ]}
        />
      </>
    );
  };

  const renderLoans = () => {
    const filtered = loans.filter(item => {
      if (employeeFilter && item.employeeName !== employeeFilter) return false;
      if (status && item.status !== status) return false;
      if (dateFrom && item.issuedDate && item.issuedDate < dateFrom) return false;
      if (dateTo && item.issuedDate && item.issuedDate > dateTo) return false;
      return true;
    });

    const total = filtered.length;
    const totalAmount = filtered.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const totalRemaining = filtered.reduce((sum, i) => sum + (Number(i.remaining) || 0), 0);

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Loans" value={total} icon={HandCoins} />
          <SummaryCard title="Total Amount" value={formatMoney(totalAmount)} icon={DollarSign} />
          <SummaryCard title="Remaining" value={formatMoney(totalRemaining)} icon={Wallet} trend="Pending" trendUp={false} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <ReactSelect
            value={employeeFilter}
            onChange={(val) => setEmployeeFilter(val || '')}
            options={employeeOptions}
            placeholder="All Employees"
            isSearchable={true}
            isClearable={false}
          />
          <ReactSelect
            value={status}
            onChange={(val) => setStatus(val || '')}
            options={[{ value: '', label: 'All Status' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]}
            placeholder="All Status"
            isSearchable={false}
            isClearable={false}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" placeholder="From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" placeholder="To" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id}
          emptyMessage="No loan records found"
          columns={[
            { header: 'ID', accessor: 'id', cell: row => <span className="font-semibold text-gray-900">#{row.id}</span> },
            { header: 'Employee', accessor: 'employeeName' },
            { header: 'Amount', accessor: 'amount', cell: row => <span className="font-semibold text-gray-900">{(row.amount || 0).toLocaleString()}</span> },
            { header: 'Paid', accessor: 'paidAmount', cell: row => <span className="text-emerald-600">{(row.paidAmount || 0).toLocaleString()}</span> },
            { header: 'Remaining', accessor: 'remaining', cell: row => <span className="text-red-600 font-semibold">{(row.remaining || 0).toLocaleString()}</span> },
            { header: 'Installment', accessor: 'installment', cell: row => (row.installment || 0).toLocaleString() },
            { header: 'Status', accessor: 'status', cell: row => <StatusBadge status={row.status} label={row.status?.toUpperCase()} /> },
            { header: 'Issued Date', accessor: 'issuedDate', cell: row => formatDateShort(row.issuedDate) },
          ]}
        />
      </>
    );
  };

  const renderEventStaff = () => {
    const filtered = eventStaff.filter(item => {
      if (employeeFilter && item.employeeName !== employeeFilter) return false;
      if (status && item.status !== status) return false;
      if (role && item.role !== role) return false;
      if (dateFrom && item.assignedDate && item.assignedDate < dateFrom) return false;
      if (dateTo && item.assignedDate && item.assignedDate > dateTo) return false;
      return true;
    });

    const total = filtered.length;
    const totalPayment = filtered.reduce((sum, i) => sum + (Number(i.payment) || 0), 0);
    const paidCount = filtered.filter(i => i.status === 'paid').length;
    const roles = [...new Set(eventStaff.map(e => e.role).filter(Boolean))];

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Assignments" value={total} icon={Users} />
          <SummaryCard title="Total Payment" value={formatMoney(totalPayment)} icon={DollarSign} />
          <SummaryCard title="Paid" value={paidCount} icon={CheckCircle2} trend="Settled" trendUp={true} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <ReactSelect
            value={employeeFilter}
            onChange={(val) => setEmployeeFilter(val || '')}
            options={employeeOptions}
            placeholder="All Employees"
            isSearchable={true}
            isClearable={false}
          />
          <ReactSelect
            value={status}
            onChange={(val) => setStatus(val || '')}
            options={[{ value: '', label: 'All Status' }, { value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }]}
            placeholder="All Status"
            isSearchable={false}
            isClearable={false}
          />
          <ReactSelect
            value={role}
            onChange={(val) => setRole(val || '')}
            options={[{ value: '', label: 'All Roles' }, ...roles.map(r => ({ value: r, label: r }))]}
            placeholder="All Roles"
            isSearchable={false}
            isClearable={false}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" placeholder="From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" placeholder="To" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id}
          emptyMessage="No event staff records found"
          columns={[
            { header: 'ID', accessor: 'id', cell: row => <span className="font-semibold text-gray-900">#{row.id}</span> },
            { header: 'Employee', accessor: 'employeeName' },
            { header: 'Event', accessor: 'eventName' },
            { header: 'Role', accessor: 'role' },
            { header: 'Assigned', accessor: 'assignedDate', cell: row => formatDateShort(row.assignedDate) },
            { header: 'Payment', accessor: 'payment', cell: row => <span className="font-semibold text-gray-900">{(row.payment || 0).toLocaleString()}</span> },
            { header: 'Attendance', accessor: 'attendance', cell: row => <StatusBadge status={row.attendance} label={row.attendance?.toUpperCase()} /> },
            { header: 'Status', accessor: 'status', cell: row => <StatusBadge status={row.status} label={row.status?.toUpperCase()} /> },
          ]}
        />
      </>
    );
  };

  const renderLedger = () => {
    const filtered = ledger.filter(item => {
      if (employeeFilter && item.employeeName !== employeeFilter) return false;
      if (transactionType && item.transactionType !== transactionType) return false;
      if (dateFrom && item.date && item.date < dateFrom) return false;
      if (dateTo && item.date && item.date > dateTo) return false;
      return true;
    });

    const total = filtered.length;
    const totalCredit = filtered.filter(i => (i.amount || 0) > 0).reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const totalDebit = filtered.filter(i => (i.amount || 0) < 0).reduce((sum, i) => sum + Math.abs(Number(i.amount) || 0), 0);
    const types = [...new Set(ledger.map(l => l.transactionType).filter(Boolean))];

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <SummaryCard title="Total Entries" value={total} icon={BookOpen} />
          <SummaryCard title="Total Credit" value={formatMoney(totalCredit)} icon={TrendingUp} trend="Inflow" trendUp={true} />
          <SummaryCard title="Total Debit" value={formatMoney(totalDebit)} icon={TrendingDown} trend="Outflow" trendUp={false} />
        </div>

        <FilterCard title="Filters" icon={Filter} onClear={clearFilters} hasFilters={hasActiveFilters}>
          <ReactSelect
            value={employeeFilter}
            onChange={(val) => setEmployeeFilter(val || '')}
            options={employeeOptions}
            placeholder="All Employees"
            isSearchable={true}
            isClearable={false}
          />
          <ReactSelect
            value={transactionType}
            onChange={(val) => setTransactionType(val || '')}
            options={[{ value: '', label: 'All Types' }, ...types.map(t => ({ value: t, label: t.toUpperCase() }))]}
            placeholder="All Types"
            isSearchable={false}
            isClearable={false}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" placeholder="From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C89B3C]/30 focus:border-[#C89B3C]" placeholder="To" />
        </FilterCard>

        <ExportToolbar onExportCSV={downloadCSV} onExportPDF={downloadPDF} onPrint={handlePrint} dataCount={filtered.length} />

        <DataTable
          loading={loading}
          data={filtered}
          keyExtractor={(row) => row.id || row._id}
          emptyMessage="No ledger records found"
          columns={[
            { header: 'ID', accessor: 'id', cell: row => <span className="font-semibold text-gray-900">#{row.id}</span> },
            { header: 'Employee', accessor: 'employeeName' },
            { header: 'Type', accessor: 'transactionType', cell: row => <span className="uppercase text-xs font-semibold text-gray-600">{row.transactionType}</span> },
            { header: 'Amount', accessor: 'amount', cell: row => (
              <span className={`font-semibold ${(row.amount || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {(row.amount || 0) >= 0 ? '+' : ''}{(row.amount || 0).toLocaleString()}
              </span>
            )},
            { header: 'Balance', accessor: 'balance', cell: row => <span className="font-bold text-gray-900">{(row.balance || 0).toLocaleString()}</span> },
            { header: 'Date', accessor: 'date', cell: row => formatDateShort(row.date) },
            { header: 'Description', accessor: 'description' },
          ]}
        />
      </>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════

  const renderTabContent = () => {
    switch (activeTab) {
      case 'employees': return renderEmployees();
      case 'attendance': return renderAttendance();
      case 'leaves': return renderLeaves();
      case 'payroll': return renderPayroll();
      case 'loans': return renderLoans();
      case 'eventStaff': return renderEventStaff();
      case 'ledger': return renderLedger();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 print:bg-white print:p-0">
      {/* Header */}
      <div className="mb-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HR, Payroll & Attendance Reports</h1>
            <p className="text-sm text-gray-500 mt-1">Manage employees, attendance, leaves, payroll, loans, event staff, and ledger</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-[#C89B3C] transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 print:hidden">
          <AlertTriangle size={20} />
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 print:hidden">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#C89B3C] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-200">
        {renderTabContent()}
      </div>
    </div>
  );
}
