// ═══════════════════════════════════════════════════════════
// services/payrollApi.js
// PAYROLL API CLIENT — Payroll | Loans | EventStaff | Ledger | StaffPayment
// ═══════════════════════════════════════════════════════════

import apiClient from './apiClient';

const getSelectedBranchId = () => {
  try {
    const branch = JSON.parse(localStorage.getItem('selectedBranch') || 'null');
    return branch?.id || null;
  } catch (e) {
    return null;
  }
};

export default {
  // ═══════════════════════════════════════════════════════════
  // PAYROLL
  // ═══════════════════════════════════════════════════════════
  getAllPayrolls: (params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = { ...params, branchId: params.branchId || branchId };
    return apiClient.get('/payroll/payrolls', { params: finalParams });
  },
  getPayrollById: (id) => apiClient.get(`/payroll/payrolls/${id}`),
  generatePayroll: (data) => {
    const branchId = getSelectedBranchId();
    return apiClient.post('/payroll/payrolls/generate', { ...data, branchId: data.branchId || branchId });
  },
  processPayroll: (id) => apiClient.put(`/payroll/payrolls/${id}/process`),
  payPayrollItem: (itemId, data = {}) => {
    const branchId = getSelectedBranchId();
    return apiClient.post(`/payroll/payrolls/items/${itemId}/pay`, { ...data, branchId: data.branchId || branchId });
  },

  // ═══════════════════════════════════════════════════════════
  // EMPLOYEE LOANS
  // ═══════════════════════════════════════════════════════════
  getAllLoans: (params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = { ...params, branchId: params.branchId || branchId };
    return apiClient.get('/payroll/loans', { params: finalParams });
  },
  getLoanById: (id) => apiClient.get(`/payroll/loans/${id}`),
  createLoan: (data) => {
    const branchId = getSelectedBranchId();
    return apiClient.post('/payroll/loans', { ...data, branchId: data.branchId || branchId });
  },
  updateLoan: (id, data) => apiClient.put(`/payroll/loans/${id}`, data),
  deleteLoan: (id) => apiClient.delete(`/payroll/loans/${id}`),
  addLoanInstallment: (loanId, data) => apiClient.post(`/payroll/loans/${loanId}/installments`, data),

  // ═══════════════════════════════════════════════════════════
  // EVENT STAFF ASSIGNMENT
  // ═══════════════════════════════════════════════════════════
  getAllEventAssignments: (params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = { ...params, branchId: params.branchId || branchId };
    return apiClient.get('/payroll/event-assignments', { params: finalParams });
  },
  getEventAssignmentById: (id) => apiClient.get(`/payroll/event-assignments/${id}`),
  createEventAssignment: (data) => {
    const branchId = getSelectedBranchId();
    return apiClient.post('/payroll/event-assignments', { ...data, branchId: data.branchId || branchId });
  },
  updateEventAssignment: (id, data) => apiClient.put(`/payroll/event-assignments/${id}`, data),
  deleteEventAssignment: (id) => apiClient.delete(`/payroll/event-assignments/${id}`),
  markEventAttendance: (id, data) => apiClient.put(`/payroll/event-assignments/${id}/attendance`, data),
  payEventAssignment: (id, data = {}) => {
    const branchId = getSelectedBranchId();
    return apiClient.post(`/payroll/event-assignments/${id}/pay`, { ...data, branchId: data.branchId || branchId });
  },

  // ═══════════════════════════════════════════════════════════
  // STAFF LEDGER
  // ═══════════════════════════════════════════════════════════
  getStaffLedger: (params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = { ...params, branchId: params.branchId || branchId };
    return apiClient.get('/payroll/ledger', { params: finalParams });
  },
  getEmployeeBalance: (employeeId) => apiClient.get(`/payroll/ledger/employee/${employeeId}/balance`),

  // ═══════════════════════════════════════════════════════════
  // STAFF PAYMENT (Direct)
  // ═══════════════════════════════════════════════════════════
  getAllStaffPayments: (params = {}) => {
    const branchId = getSelectedBranchId();
    const finalParams = { ...params, branchId: params.branchId || branchId };
    return apiClient.get('/payroll/staff-payments', { params: finalParams });
  },
  getStaffPaymentById: (id) => apiClient.get(`/payroll/staff-payments/${id}`),
  createStaffPayment: (data) => {
    const branchId = getSelectedBranchId();
    return apiClient.post('/payroll/staff-payments', { ...data, branchId: data.branchId || branchId });
  },
  deleteStaffPayment: (id) => apiClient.delete(`/payroll/staff-payments/${id}`),

  // ═══════════════════════════════════════════════════════════
  // BRANCH-BASED SHORTCUTS
  // ═══════════════════════════════════════════════════════════
  getPayrollsByBranch: (branchId) => apiClient.get(`/payroll/branch/${branchId}/payrolls`),
  getLoansByBranch: (branchId) => apiClient.get(`/payroll/branch/${branchId}/loans`),
  getEventAssignmentsByBranch: (branchId) => apiClient.get(`/payroll/branch/${branchId}/event-assignments`),
  getLedgerByBranch: (branchId) => apiClient.get(`/payroll/branch/${branchId}/ledger`),
  getStaffPaymentsByBranch: (branchId) => apiClient.get(`/payroll/branch/${branchId}/staff-payments`),
};