// ═══════════════════════════════════════════════════════════
// pages/ReceiptSettings.jsx
// FIXED — Receipt Customization Page (Input Focus Bug Resolved)
// Route: /receipt-settings
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, RotateCcw, Printer, Thermometer,
  Image, Type, AlignLeft, AlignCenter, Eye,
  Palette, Smartphone, Monitor, Info,
  Upload, Globe, Phone, Mail, MapPin, Hash, Tag, Sparkles,
  Building2, User, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import receiptSettingsApi from '../../services/receiptSettingsApi';
import { formatPhone } from '../../utils/validators';

// ── DEFAULT SETTINGS ──
const defaultSettings = {
  companyName: 'UniSoft Enterprise',
  companySlogan: 'Premium Event & Hall Booking',
  address: 'Main Branch, City Center',
  phone: '0300-1234567',
  email: 'info@unisoft.com',
  website: 'www.unisoft.com',
  logoUrl: '',
  headerText: 'Thank you for choosing us!',
  footerText: 'This is a system generated receipt. No signature required.',
  marqueeText: 'Welcome to UniSoft Enterprise - Best Event Management',
  showLogo: true,
  showCompanyName: true,
  showSlogan: true,
  showAddress: true,
  showPhone: true,
  showEmail: true,
  showWebsite: true,
  showHeaderText: true,
  showFooterText: true,
  showMarquee: true,
  showQrCode: false,
  showBarcode: false,
  showGst: false,
  gstNumber: 'GST-12345678',
  showNTN: false,
  ntnNumber: 'NTN-987654321',
  showCustomerDetails: true,
  showPaymentHistory: true,
  themeColor: '#1a1a2e',
  accentColor: '#2563EB',
  thermalWidth: '80mm',
  thermalFontSize: '12px',
};

// ═══════════════════════════════════════════════════════════
// FIXED: Moved outside main component so React doesn't remount
// them on every state change (this was causing the single-char bug)
// ═══════════════════════════════════════════════════════════

const Toggle = ({ label, checked, onChange, icon: Icon, disabled }) => (
  <div className="flex items-center justify-between p-3 bg-white rounded-xl border hover:border-amber-300 transition-all" style={{ borderColor: '#CBD5E1' }}>
    <div className="flex items-center gap-2">
      {Icon && <Icon size={16} style={{ color: '#2563EB' }} />}
      <span className="text-sm font-semibold text-gray-700">{label}</span>
    </div>
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-green-600' : 'bg-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

const Input = ({ label, value, onChange, placeholder, type = 'text', icon: Icon, disabled, maxLength, inputMode }) => (
  <div>
    <label className="text-xs font-bold uppercase mb-1.5 block text-gray-500 flex items-center gap-1.5">
      {Icon && <Icon size={12} style={{ color: '#2563EB' }} />}
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      inputMode={inputMode}
      className="w-full border rounded-xl px-3 py-2.5 text-sm transition-all focus:ring-2 focus:ring-amber-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }}
    />
  </div>
);

// ── PREVIEW HELPERS ──
const formatCurrency = (val) => `Rs ${Number(val || 0).toLocaleString('en-PK')}`;
const formatDate = (d) => {
  const date = d ? new Date(d) : new Date();
  return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
};
const formatTime = (d) => {
  const date = d ? new Date(d) : new Date();
  return date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
};
const formatDateTime = (d) => {
  const date = d ? new Date(d) : new Date();
  return date.toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const dummyBooking = {
  bookingNo: 'BK-00123',
  guestName: 'Ahmed Khan',
  guestPhone: '0300-1234567',
  guestEmail: 'ahmed@example.com',
  customer: { cnic: '35201-1234567-8', city: 'Lahore' },
  hall: { name: 'Royal Hall', price: 25000, perSeatPrice: 500 },
  hallChargeMode: 'per_seat',
  guestCount: 100,
  menus: [
    { menuName: 'Chicken Biryani', quantity: 100, unitPrice: 350, totalPrice: 35000 },
    { menuName: 'Mutton Karahi', quantity: 50, unitPrice: 800, totalPrice: 40000 },
  ],
  services: [
    { serviceName: 'Decoration', quantity: 1, unitPrice: 15000, totalPrice: 15000 },
  ],
  customItems: [
    { itemName: 'Extra Chairs', quantity: 20, unitPrice: 50, totalPrice: 1000, displayNote: 'White plastic' },
  ],
  payments: [
    { date: new Date().toISOString(), mode: 'cash', description: 'Advance', amount: 30000 },
    { date: new Date().toISOString(), mode: 'bank_transfer', description: '2nd Installment', amount: 20000 },
  ],
  totalAmount: 111000,
  discount: 5000,
  paidAmount: 50000,
  dueAmount: 56000,
  paymentStatus: 'partial',
};

const previewA4 = (settings) => {
  const s = settings;
  const b = dummyBooking;

  const hallRent = Number(b.hall?.price || b.hall?.cost || 0);
  const totalAmount = Number(b.totalAmount || 0);
  const discount = Number(b.discount || 0);
  const paidAmount = Number(b.paidAmount || b.advanceAmount || 0);
  const dueAmount = Number(b.dueAmount || 0);

  const logoHtml = s.showLogo && s.logoUrl
    ? `<img src="${s.logoUrl}" style="max-height:60px;max-width:120px;object-fit:contain;" />`
    : `<div style="font-size:28px;font-weight:800;letter-spacing:2px;color:${s.themeColor};">${s.companyName?.charAt(0) || 'U'}</div>`;

  const menuRows = (b.menus || []).map(m =>
    `<tr>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;">${m.menuName || m.name}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${m.quantity}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${formatCurrency(m.unitPrice)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;font-weight:600;">${formatCurrency(m.totalPrice)}</td>
    </tr>`
  ).join('');

  const serviceRows = (b.services || []).map(sv =>
    `<tr>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;">${sv.serviceName || sv.name}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${sv.quantity}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${formatCurrency(sv.unitPrice)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;font-weight:600;">${formatCurrency(sv.totalPrice)}</td>
    </tr>`
  ).join('');

  const customRows = (b.customItems || []).map(i =>
    `<tr>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;">${i.itemName}${i.displayNote ? `<br><span style="color:#888;font-size:11px;">${i.displayNote}</span>` : ''}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${i.quantity}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${formatCurrency(i.unitPrice)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;font-weight:600;">${formatCurrency(i.totalPrice)}</td>
    </tr>`
  ).join('');

  const paymentRows = (b.payments || []).map(p =>
    `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #f0eee8;font-size:12px;">${formatDate(p.date || p.createdAt)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0eee8;font-size:12px;">${p.mode?.replace('_', ' ').toUpperCase() || '-'}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0eee8;font-size:12px;">${p.description || '-'}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0eee8;font-size:12px;text-align:right;font-weight:600;">${formatCurrency(p.amount)}</td>
    </tr>`
  ).join('');

  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
      ${s.showCompanyName || s.showAddress || s.showPhone ? `
      <div style="text-align:center;padding:15px 35px;background:#fafafa;border-bottom:1px solid #e8e6e0;">
        <div style="margin-bottom:8px;">${logoHtml}</div>
        ${s.showCompanyName ? `<h2 style="font-size:18px;font-weight:700;color:${s.themeColor};margin-bottom:4px;">${s.companyName}</h2>` : ''}
        ${s.showSlogan && s.companySlogan ? `<p style="font-style:italic;color:#888;margin-bottom:6px;font-size:11px;">${s.companySlogan}</p>` : ''}
        ${s.showAddress && s.address ? `<p style="font-size:11px;color:#666;line-height:1.6;margin:2px 0;">📍 ${s.address}</p>` : ''}
        ${s.showPhone && s.phone ? `<p style="font-size:11px;color:#666;line-height:1.6;margin:2px 0;">📞 ${s.phone}</p>` : ''}
        ${s.showEmail && s.email ? `<p style="font-size:11px;color:#666;line-height:1.6;margin:2px 0;">✉️ ${s.email}</p>` : ''}
        ${s.showWebsite && s.website ? `<p style="font-size:11px;color:#666;line-height:1.6;margin:2px 0;">🌐 ${s.website}</p>` : ''}
        ${s.showGst && s.gstNumber ? `<p style="font-size:11px;color:#666;line-height:1.6;margin:2px 0;">GST: ${s.gstNumber}</p>` : ''}
        ${s.showNTN && s.ntnNumber ? `<p style="font-size:11px;color:#666;line-height:1.6;margin:2px 0;">NTN: ${s.ntnNumber}</p>` : ''}
      </div>
      ` : ''}

      <div style="background:${s.themeColor};padding:20px 30px;color:#ffffff;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <h1 style="font-size:20px;font-weight:700;letter-spacing:1px;margin:0;">Booking Receipt</h1>
          <p style="font-size:11px;opacity:0.7;margin-top:4px;">Premium Event & Hall Booking</p>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;opacity:0.6;">Booking #</div>
          <div style="font-size:18px;font-weight:700;font-family:'Courier New',monospace;letter-spacing:1px;">${b.bookingNo || b.id || 'PENDING'}</div>
        </div>
      </div>

      <div style="padding:25px 30px;">
        ${s.showCustomerDetails ? `
        <div style="background:#f8f7f4;border-radius:8px;padding:15px 18px;margin-bottom:20px;">
          <h3 style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#888;margin-bottom:8px;font-weight:600;">Customer Details</h3>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
            <span style="color:#666;">Name</span>
            <span style="font-weight:600;color:#1a1a2e;">${b.guestName || 'N/A'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">
            <span style="color:#666;">Phone</span>
            <span style="font-weight:600;color:#1a1a2e;">${b.guestPhone || 'N/A'}</span>
          </div>
          ${b.guestEmail ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#666;">Email</span><span style="font-weight:600;color:#1a1a2e;">${b.guestEmail}</span></div>` : ''}
          ${b.customer?.cnic ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#666;">CNIC</span><span style="font-weight:600;color:#1a1a2e;">${b.customer.cnic}</span></div>` : ''}
          ${b.customer?.city ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#666;">City</span><span style="font-weight:600;color:#1a1a2e;">${b.customer.city}</span></div>` : ''}
        </div>
        ` : ''}

        <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
          <thead>
            <tr style="background:#f8f7f4;">
              <th style="padding:10px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#666;border-bottom:2px solid #e8e6e0;">Item / Service</th>
              <th style="padding:10px 14px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#666;border-bottom:2px solid #e8e6e0;">Qty</th>
              <th style="padding:10px 14px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#666;border-bottom:2px solid #e8e6e0;">Rate</th>
              <th style="padding:10px 14px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#666;border-bottom:2px solid #e8e6e0;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${b.hall ? `<tr>
              <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;">
                <strong>${b.hallChargeMode === 'per_seat' ? `Hall Rent (&times;${b.guestCount} guests)` : 'Hall Rent (Full Hall)'}</strong>
                <br><span style="color:#888;font-size:11px;">${b.hall.name || ''}</span>
              </td>
              <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${b.hallChargeMode === 'per_seat' ? (b.guestCount || 0) : 1}</td>
              <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${formatCurrency(b.hallChargeMode === 'per_seat' ? (b.hall.perSeatPrice || b.hall.price || 0) : (b.hall.price || 0))}</td>
              <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;font-weight:600;">${formatCurrency(hallRent)}</td>
            </tr>` : ''}
            ${menuRows}
            ${customRows}
            ${serviceRows}
          </tbody>
        </table>

        <div style="margin-top:25px;border-top:2px solid #e8e6e0;padding-top:20px;">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;">
            <div style="text-align:center;padding:12px;border-radius:8px;background:#f8f7f4;">
              <span style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;display:block;">Subtotal</span>
              <span style="font-size:16px;font-weight:700;margin-top:4px;display:block;">${formatCurrency(totalAmount + discount)}</span>
            </div>
            ${discount > 0 ? `<div style="text-align:center;padding:12px;border-radius:8px;background:#f8f7f4;">
              <span style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;display:block;">Discount</span>
              <span style="font-size:16px;font-weight:700;margin-top:4px;display:block;color:#2980b9;">-${formatCurrency(discount)}</span>
            </div>` : ''}
            <div style="text-align:center;padding:12px;border-radius:8px;background:#f8f7f4;">
              <span style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;display:block;">Grand Total</span>
              <span style="font-size:16px;font-weight:700;margin-top:4px;display:block;color:#1a1a2e;">${formatCurrency(totalAmount)}</span>
            </div>
            <div style="text-align:center;padding:12px;border-radius:8px;background:#f8f7f4;">
              <span style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;display:block;">Due Balance</span>
              <span style="font-size:16px;font-weight:700;margin-top:4px;display:block;color:#c0392b;">${formatCurrency(dueAmount)}</span>
            </div>
          </div>
        </div>

        ${b.payments.length > 0 && s.showPaymentHistory ? `
        <div style="margin-top:20px;">
          <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:10px;">Payment History</h4>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#f8f7f4;">
                <th style="text-align:left;padding:6px 10px;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;">Date</th>
                <th style="text-align:left;padding:6px 10px;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;">Mode</th>
                <th style="text-align:left;padding:6px 10px;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;">Description</th>
                <th style="text-align:right;padding:6px 10px;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;">Amount</th>
              </tr>
            </thead>
            <tbody>${paymentRows}</tbody>
          </table>
        </div>
        ` : ''}

        <div style="margin-top:20px;padding-top:15px;border-top:1px solid #e8e6e0;display:flex;justify-content:space-between;font-size:11px;color:#888;">
          <span>Payment Status: ${b.paymentStatus || 'pending'}</span>
          <span>Generated: ${formatDateTime(new Date())}</span>
        </div>
      </div>

      <div style="background:#f8f7f4;padding:15px 30px;text-align:center;font-size:10px;color:#999;border-top:1px solid #e8e6e0;margin-top:10px;">
        ${s.showHeaderText && s.headerText ? `<p style="margin-bottom:6px;font-weight:600;color:#444;">${s.headerText}</p>` : ''}
        <strong>${s.showFooterText && s.footerText ? s.footerText : 'Thank you for choosing us!'}</strong>
      </div>
    </div>
  `;
};

const previewThermal = (settings) => {
  const s = settings;
  const b = dummyBooking;

  const hallRent = Number(b.hall?.price || b.hall?.cost || 0);
  const totalAmount = Number(b.totalAmount || 0);
  const discount = Number(b.discount || 0);
  const paidAmount = Number(b.paidAmount || b.advanceAmount || 0);
  const dueAmount = Number(b.dueAmount || 0);

  const width = s.thermalWidth === '58mm' ? '160px' : '220px';
  const fontSize = s.thermalFontSize || '12px';

  const logoHtml = s.showLogo && s.logoUrl
    ? `<div style="text-align:center;margin-bottom:6px;"><img src="${s.logoUrl}" style="max-height:50px;max-width:100px;object-fit:contain;" /></div>`
    : '';

  const menuItems = (b.menus || []).map(m =>
    `<tr>
      <td style="padding:2px 0;font-size:11px;">${m.menuName || m.name}</td>
      <td style="padding:2px 0;font-size:11px;text-align:center;">${m.quantity}</td>
      <td style="padding:2px 0;font-size:11px;text-align:right;">${formatCurrency(m.totalPrice)}</td>
    </tr>`
  ).join('');

  const serviceItems = (b.services || []).map(sv =>
    `<tr>
      <td style="padding:2px 0;font-size:11px;">${sv.serviceName || sv.name}</td>
      <td style="padding:2px 0;font-size:11px;text-align:center;">${sv.quantity}</td>
      <td style="padding:2px 0;font-size:11px;text-align:right;">${formatCurrency(sv.totalPrice)}</td>
    </tr>`
  ).join('');

  const customItems = (b.customItems || []).map(i =>
    `<tr>
      <td style="padding:2px 0;font-size:11px;">${i.itemName}</td>
      <td style="padding:2px 0;font-size:11px;text-align:center;">${i.quantity}</td>
      <td style="padding:2px 0;font-size:11px;text-align:right;">${formatCurrency(i.totalPrice)}</td>
    </tr>`
  ).join('');

  const paymentRows = (b.payments || []).map(p =>
    `<tr>
      <td style="padding:2px 0;font-size:10px;">${formatDate(p.date || p.createdAt)}</td>
      <td style="padding:2px 0;font-size:10px;text-align:center;">${p.mode?.replace('_',' ').toUpperCase()}</td>
      <td style="padding:2px 0;font-size:10px;text-align:right;">${formatCurrency(p.amount)}</td>
    </tr>`
  ).join('');

  return `
    <div style="font-family:'Courier New',monospace;font-size:${fontSize};width:${width};margin:0 auto;background:#fff;border:1px solid #ddd;padding:6px;line-height:1.3;">
      ${logoHtml}
      ${s.showCompanyName ? `<div style="text-align:center;font-weight:bold;font-size:14px;">${s.companyName}</div>` : ''}
      ${s.showSlogan && s.companySlogan ? `<div style="text-align:center;font-size:10px;color:#333;">${s.companySlogan}</div>` : ''}
      ${s.showAddress && s.address ? `<div style="text-align:center;font-size:10px;">${s.address}</div>` : ''}
      ${s.showPhone && s.phone ? `<div style="text-align:center;font-size:10px;">Ph: ${s.phone}</div>` : ''}
      ${s.showEmail && s.email ? `<div style="text-align:center;font-size:10px;">${s.email}</div>` : ''}
      ${s.showGst && s.gstNumber ? `<div style="text-align:center;font-size:10px;">GST: ${s.gstNumber}</div>` : ''}
      ${s.showNTN && s.ntnNumber ? `<div style="text-align:center;font-size:10px;">NTN: ${s.ntnNumber}</div>` : ''}

      <div style="border-top:1px dashed #000;margin:6px 0;"></div>

      <div style="text-align:center;font-weight:bold;font-size:13px;">BOOKING RECEIPT</div>
      <div style="text-align:center;font-size:11px;">#${b.bookingNo || b.id || 'PENDING'}</div>

      <div style="border-top:1px dashed #000;margin:6px 0;"></div>

      ${s.showCustomerDetails ? `
      <div style="font-size:11px;font-weight:bold;margin-bottom:3px;">CUSTOMER</div>
      <div style="font-size:11px;">${b.guestName || 'Walk-in'}</div>
      <div style="font-size:10px;">${b.guestPhone || ''}</div>
      ${b.guestEmail ? `<div style="font-size:10px;">${b.guestEmail}</div>` : ''}
      <div style="border-top:1px dashed #000;margin:6px 0;"></div>
      ` : ''}

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="font-size:10px;border-bottom:1px solid #000;">
            <th style="text-align:left;padding:2px 0;">Item</th>
            <th style="text-align:center;padding:2px 0;">Qty</th>
            <th style="text-align:right;padding:2px 0;">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${b.hall ? `<tr>
            <td style="padding:2px 0;font-size:11px;">Hall: ${b.hall.name || ''}</td>
            <td style="padding:2px 0;font-size:11px;text-align:center;">${b.hallChargeMode === 'per_seat' ? (b.guestCount || 0) : 1}</td>
            <td style="padding:2px 0;font-size:11px;text-align:right;">${formatCurrency(hallRent)}</td>
          </tr>` : ''}
          ${menuItems}
          ${customItems}
          ${serviceItems}
        </tbody>
      </table>

      <div style="border-top:2px solid #000;margin:6px 0;"></div>

      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="font-size:11px;">Subtotal</td><td style="font-size:11px;text-align:right;font-weight:bold;">${formatCurrency(totalAmount + discount)}</td></tr>
        ${discount > 0 ? `<tr><td style="font-size:11px;">Discount</td><td style="font-size:11px;text-align:right;">-${formatCurrency(discount)}</td></tr>` : ''}
        <tr><td style="font-size:12px;font-weight:bold;">TOTAL</td><td style="font-size:12px;text-align:right;font-weight:bold;">${formatCurrency(totalAmount)}</td></tr>
        <tr><td style="font-size:11px;">Paid</td><td style="font-size:11px;text-align:right;">${formatCurrency(paidAmount)}</td></tr>
        <tr><td style="font-size:11px;">Due</td><td style="font-size:11px;text-align:right;font-weight:bold;">${formatCurrency(dueAmount)}</td></tr>
      </table>

      ${b.payments.length > 0 && s.showPaymentHistory ? `
      <div style="border-top:1px dashed #000;margin:6px 0;"></div>
      <div style="font-size:10px;font-weight:bold;margin-bottom:3px;">PAYMENTS</div>
      <table style="width:100%;border-collapse:collapse;"><tbody>${paymentRows}</tbody></table>
      ` : ''}

      <div style="border-top:2px solid #000;margin:6px 0;"></div>

      <div style="text-align:center;font-size:10px;margin-top:6px;">
        ${s.showHeaderText && s.headerText ? `<div style="margin-bottom:4px;font-weight:bold;">${s.headerText}</div>` : ''}
        <div>Payment: ${b.paymentStatus || 'pending'}</div>
        <div style="margin-top:4px;font-size:9px;">Generated: ${formatDateTime(new Date())}</div>
        ${s.showFooterText && s.footerText ? `<div style="margin-top:6px;border-top:1px dashed #000;padding-top:4px;">${s.footerText}</div>` : ''}
        ${s.showWebsite && s.website ? `<div style="font-size:9px;margin-top:2px;">${s.website}</div>` : ''}
      </div>
    </div>
  `;
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

const ReceiptSettings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(defaultSettings);
  const [activePreview, setActivePreview] = useState('a4');
  const [savedFlag, setSavedFlag] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState(null);

  // ── Fetch Settings from Backend ──
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await receiptSettingsApi.getAll();
      console.log('📥 fetchSettings raw response:', res);

      const dataArray = res?.data || res;

      if (Array.isArray(dataArray) && dataArray.length > 0) {
        const db = dataArray[0];
        setSettingsId(db.id);
        setSettings(prev => ({ ...defaultSettings, ...db }));
        console.log('✅ Settings loaded from DB, id:', db.id);
      } else {
        console.log('ℹ️ No settings found in DB, using defaults');
        setSettings(defaultSettings);
        setSettingsId(null);
      }
    } catch (err) {
      console.error('❌ fetchSettings error:', err);
      toast.error('Failed to load settings from server');
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  // ── Load on mount ──
  useEffect(() => {
    fetchSettings();
  }, []);

  const updateField = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setSavedFlag(false);
  };

  const toggleField = (field) => {
    setSettings(prev => ({ ...prev, [field]: !prev[field] }));
    setSavedFlag(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSavedFlag(false);

      let res;

      if (settingsId) {
        console.log('🔄 Updating settings id:', settingsId);
        res = await receiptSettingsApi.update(settingsId, settings);
      } else {
        console.log('🆕 Creating new settings...');
        res = await receiptSettingsApi.create(settings);
      }

      console.log('📤 Save response:', res);
      const responseData = res?.data || res;

      // Handle 409 conflict
      if (res?.status === 409 && responseData?.existingId) {
        console.log('⚠️ Got 409 with existingId:', responseData.existingId);
        setSettingsId(responseData.existingId);

        const serverData = responseData.data || responseData;
        setSettings(prev => ({ ...defaultSettings, ...prev, ...serverData }));
        setSavedFlag(true);
        toast.success('Settings loaded from server!');

        console.log('🔄 Auto-updating existing settings...');
        const updateRes = await receiptSettingsApi.update(responseData.existingId, settings);
        const updateData = updateRes?.data || updateRes;

        if (updateRes?.success || updateData?.id) {
          toast.success('Settings updated!');
          setSettings(prev => ({ ...defaultSettings, ...prev, ...updateData }));
        }
        return;
      }

      if (res?.success || responseData?.id) {
        toast.success(settingsId ? 'Settings updated!' : 'Settings saved!');
        setSavedFlag(true);

        const newId = responseData?.id || settingsId;
        if (!settingsId && newId) {
          setSettingsId(newId);
          console.log('🆔 New settingsId set:', newId);
        }

        if (responseData && typeof responseData === 'object') {
          setSettings(prev => ({ ...defaultSettings, ...prev, ...responseData }));
        }
        return;
      }

      throw new Error(res?.message || 'Unexpected response from server');

    } catch (err) {
      console.error('❌ handleSave FULL ERROR:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to save settings';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all receipt settings to default?')) return;

    setSettings(defaultSettings);
    setSavedFlag(false);

    if (settingsId) {
      try {
        setSaving(true);
        await receiptSettingsApi.update(settingsId, defaultSettings);
        toast.success('Settings reset to default');
        setSavedFlag(true);
      } catch (err) {
        console.error('❌ Reset save error:', err?.message || err);
        toast.error('Reset locally but failed to update server');
      } finally {
        setSaving(false);
      }
    } else {
      toast.success('Form reset to default');
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateField('logoUrl', ev.target.result);
      toast.success('Logo uploaded');
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: '#2563EB' }} />
          <p className="text-sm font-medium text-gray-500">Loading receipt settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
      {/* ═══ HEADER ═══ */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl" style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderColor: '#CBD5E1' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition-all">
                <ArrowLeft size={20} style={{ color: '#334155' }} />
              </button>
              <div>
                <h1 className="text-lg font-bold" style={{ color: '#0F172A' }}>Receipt Settings</h1>
                <p className="text-xs font-medium" style={{ color: '#475569' }}>Customize your A4 & Thermal receipts</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: '#CBD5E1', color: '#B71C1C' }}
              >
                <RotateCcw size={14} className={saving ? 'animate-spin' : ''} /> Reset
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white shadow-md transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB)' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {savedFlag ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ═══ LEFT: SETTINGS FORM ═══ */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── Company Info ── */}
            <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
                <Building2 size={16} style={{ color: '#2563EB' }} /> Company Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Company Name" value={settings.companyName} onChange={v => updateField('companyName', v)} placeholder="Your Business Name" icon={Type} disabled={saving} />
                <Input label="Slogan / Tagline" value={settings.companySlogan} onChange={v => updateField('companySlogan', v)} placeholder="Premium Event Management" icon={Sparkles} disabled={saving} />
                <Input label="Address" value={settings.address} onChange={v => updateField('address', v)} placeholder="Full address" icon={MapPin} disabled={saving} />
                <Input label="Phone Number" value={settings.phone} onChange={v => updateField('phone', formatPhone(v))} maxLength={12} inputMode="numeric" placeholder="0300-1234567 / 042-12345678" icon={Phone} disabled={saving} />
                <Input label="Email" value={settings.email} onChange={v => updateField('email', v)} placeholder="info@company.com" type="email" icon={Mail} disabled={saving} />
                <Input label="Website" value={settings.website} onChange={v => updateField('website', v)} placeholder="www.company.com" icon={Globe} disabled={saving} />
              </div>
            </div>

            {/* ── Logo ── */}
            <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
                <Image size={16} style={{ color: '#2563EB' }} /> Logo
              </h2>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border flex items-center justify-center overflow-hidden" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }}>
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Image size={24} className="text-gray-300" />
                  )}
                </div>
                <div className="flex-1">
                  <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer transition-all hover:scale-[1.02] ${saving ? 'opacity-50 cursor-not-allowed' : ''}`} style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB)' }}>
                    <Upload size={14} /> Upload Logo
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={saving} />
                  </label>
                  <p className="text-[11px] text-gray-400 mt-2">Max 2MB. PNG, JPG, SVG supported.</p>
                  {settings.logoUrl && (
                    <button onClick={() => updateField('logoUrl', '')} disabled={saving} className="text-xs text-red-500 mt-1 hover:underline disabled:opacity-50">
                      Remove logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Receipt Text ── */}
            <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
                <AlignCenter size={16} style={{ color: '#2563EB' }} /> Receipt Text
              </h2>
              <div className="space-y-4">
                <Input label="Header Text (shown before footer)" value={settings.headerText} onChange={v => updateField('headerText', v)} placeholder="Thank you for your business!" icon={Type} disabled={saving} />
                <Input label="Footer Text" value={settings.footerText} onChange={v => updateField('footerText', v)} placeholder="System generated receipt. No signature required." icon={AlignLeft} disabled={saving} />
                <Input label="Marquee / Scrolling Text" value={settings.marqueeText} onChange={v => updateField('marqueeText', v)} placeholder="Welcome to our business..." icon={Tag} disabled={saving} />
              </div>
            </div>

            {/* ── Tax & Legal ── */}
            <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
                <Hash size={16} style={{ color: '#2563EB' }} /> Tax & Legal
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <input type="checkbox" id="showGst" checked={settings.showGst} onChange={() => toggleField('showGst')} disabled={saving} className="w-4 h-4 accent-amber-600" />
                  <label htmlFor="showGst" className="text-sm font-semibold text-gray-700 cursor-pointer flex-1">Show GST Number</label>
                </div>
                {settings.showGst && (
                  <Input label="GST Number" value={settings.gstNumber} onChange={v => updateField('gstNumber', v)} placeholder="GST-12345678" disabled={saving} />
                )}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <input type="checkbox" id="showNTN" checked={settings.showNTN} onChange={() => toggleField('showNTN')} disabled={saving} className="w-4 h-4 accent-amber-600" />
                  <label htmlFor="showNTN" className="text-sm font-semibold text-gray-700 cursor-pointer flex-1">Show NTN Number</label>
                </div>
                {settings.showNTN && (
                  <Input label="NTN Number" value={settings.ntnNumber} onChange={v => updateField('ntnNumber', v)} placeholder="NTN-987654321" disabled={saving} />
                )}
              </div>
            </div>

            {/* ── Show / Hide Toggles ── */}
            <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
                <Eye size={16} style={{ color: '#2563EB' }} /> Show / Hide Fields
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Toggle label="Company Logo" checked={settings.showLogo} onChange={() => toggleField('showLogo')} icon={Image} disabled={saving} />
                <Toggle label="Company Name" checked={settings.showCompanyName} onChange={() => toggleField('showCompanyName')} icon={Type} disabled={saving} />
                <Toggle label="Slogan / Tagline" checked={settings.showSlogan} onChange={() => toggleField('showSlogan')} icon={Sparkles} disabled={saving} />
                <Toggle label="Address" checked={settings.showAddress} onChange={() => toggleField('showAddress')} icon={MapPin} disabled={saving} />
                <Toggle label="Phone Number" checked={settings.showPhone} onChange={() => toggleField('showPhone')} icon={Phone} disabled={saving} />
                <Toggle label="Email" checked={settings.showEmail} onChange={() => toggleField('showEmail')} icon={Mail} disabled={saving} />
                <Toggle label="Website" checked={settings.showWebsite} onChange={() => toggleField('showWebsite')} icon={Globe} disabled={saving} />
                <Toggle label="Header Text" checked={settings.showHeaderText} onChange={() => toggleField('showHeaderText')} icon={AlignCenter} disabled={saving} />
                <Toggle label="Footer Text" checked={settings.showFooterText} onChange={() => toggleField('showFooterText')} icon={AlignLeft} disabled={saving} />
                <Toggle label="Marquee Text" checked={settings.showMarquee} onChange={() => toggleField('showMarquee')} icon={Tag} disabled={saving} />
                <Toggle label="Customer Details Box" checked={settings.showCustomerDetails} onChange={() => toggleField('showCustomerDetails')} icon={User} disabled={saving} />
                <Toggle label="Payment History" checked={settings.showPaymentHistory} onChange={() => toggleField('showPaymentHistory')} icon={Hash} disabled={saving} />
                <Toggle label="QR Code Placeholder" checked={settings.showQrCode} onChange={() => toggleField('showQrCode')} icon={Smartphone} disabled={saving} />
                <Toggle label="Barcode Placeholder" checked={settings.showBarcode} onChange={() => toggleField('showBarcode')} icon={Hash} disabled={saving} />
              </div>
            </div>

            {/* ── Theme & Colors ── */}
            <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
                <Palette size={16} style={{ color: '#2563EB' }} /> Theme & Colors
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase mb-1.5 block text-gray-500">Theme Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={settings.themeColor} onChange={e => updateField('themeColor', e.target.value)} disabled={saving} className="w-12 h-10 rounded-lg border cursor-pointer disabled:opacity-50" style={{ borderColor: '#CBD5E1' }} />
                    <input type="text" value={settings.themeColor} onChange={e => updateField('themeColor', e.target.value)} disabled={saving} className="flex-1 border rounded-xl px-3 py-2.5 text-sm font-mono disabled:opacity-50" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-1.5 block text-gray-500">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={settings.accentColor} onChange={e => updateField('accentColor', e.target.value)} disabled={saving} className="w-12 h-10 rounded-lg border cursor-pointer disabled:opacity-50" style={{ borderColor: '#CBD5E1' }} />
                    <input type="text" value={settings.accentColor} onChange={e => updateField('accentColor', e.target.value)} disabled={saving} className="flex-1 border rounded-xl px-3 py-2.5 text-sm font-mono disabled:opacity-50" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Thermal Printer Settings ── */}
            <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
                <Thermometer size={16} style={{ color: '#2563EB' }} /> Thermal Printer Settings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase mb-1.5 block text-gray-500">Paper Width</label>
                  <select value={settings.thermalWidth} onChange={e => updateField('thermalWidth', e.target.value)} disabled={saving} className="w-full border rounded-xl px-3 py-2.5 text-sm disabled:opacity-50" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }}>
                    <option value="58mm">58mm (Small)</option>
                    <option value="80mm">80mm (Standard)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase mb-1.5 block text-gray-500">Font Size</label>
                  <select value={settings.thermalFontSize} onChange={e => updateField('thermalFontSize', e.target.value)} disabled={saving} className="w-full border rounded-xl px-3 py-2.5 text-sm disabled:opacity-50" style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }}>
                    <option value="10px">Small (10px)</option>
                    <option value="11px">Medium (11px)</option>
                    <option value="12px">Standard (12px)</option>
                    <option value="13px">Large (13px)</option>
                    <option value="14px">Extra Large (14px)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ RIGHT: LIVE PREVIEW ═══ */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: '#0F172A' }}>
                    <Eye size={16} style={{ color: '#2563EB' }} /> Live Preview
                  </h3>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button onClick={() => setActivePreview('a4')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activePreview === 'a4' ? 'bg-white shadow text-amber-700' : 'text-gray-500'}`}>
                      <Monitor size={12} className="inline mr-1" />A4
                    </button>
                    <button onClick={() => setActivePreview('thermal')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activePreview === 'thermal' ? 'bg-white shadow text-amber-700' : 'text-gray-500'}`}>
                      <Thermometer size={12} className="inline mr-1" />Thermal
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 overflow-auto" style={{ maxHeight: '70vh' }}>
                  <div dangerouslySetInnerHTML={{ __html: activePreview === 'a4' ? previewA4(settings) : previewThermal(settings) }} />
                </div>
                <p className="text-[11px] text-gray-400 mt-3 text-center flex items-center justify-center gap-1">
                  <Info size={11} /> This is a sample preview with dummy data
                </p>
              </div>

              <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: '#CBD5E1' }}>
                <h3 className="font-bold text-sm mb-3" style={{ color: '#0F172A' }}>Quick Test Print</h3>
                <div className="space-y-2">
                  <button onClick={() => toast('Go to any booking and click Print → A4 to test', { icon: '💡' })} className="w-full py-2.5 rounded-xl text-sm font-bold border hover:bg-gray-50 transition-all flex items-center justify-center gap-2" style={{ borderColor: '#CBD5E1', color: '#334155' }}>
                    <Printer size={14} /> Test A4 Print
                  </button>
                  <button onClick={() => toast('Go to any booking and click Print → Thermal to test', { icon: '💡' })} className="w-full py-2.5 rounded-xl text-sm font-bold border hover:bg-gray-50 transition-all flex items-center justify-center gap-2" style={{ borderColor: '#CBD5E1', color: '#334155' }}>
                    <Thermometer size={14} /> Test Thermal Print
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptSettings;