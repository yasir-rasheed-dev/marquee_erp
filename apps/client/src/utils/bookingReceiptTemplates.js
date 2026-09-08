// ═══════════════════════════════════════════════════════════
// utils/bookingReceiptTemplates.js
// Booking Receipt Templates — A4 + Thermal
// Design: ReceiptSettings.jsx style | NO Event Details Section
// ═══════════════════════════════════════════════════════════

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
  showLogo: true,
  showCompanyName: true,
  showSlogan: true,
  showAddress: true,
  showPhone: true,
  showEmail: true,
  showWebsite: true,
  showHeaderText: true,
  showFooterText: true,
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

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A';

export const generateA4HTML = (booking, rawSettings = {}, formatCurrency) => {
  const s = { ...defaultSettings, ...rawSettings };

  const payments = booking.payments || [];
  const menuRows = (booking.menus || []).map(m =>
    `<tr>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;">${m.menuName || m.name}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${m.quantity}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${formatCurrency(m.unitPrice)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;font-weight:600;">${formatCurrency(m.totalPrice)}</td>
    </tr>`
  ).join('');

  const serviceRows = (booking.services || []).map(sv =>
    `<tr>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;">${sv.serviceName || sv.name}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${sv.quantity}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${formatCurrency(sv.unitPrice)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;font-weight:600;">${formatCurrency(sv.totalPrice)}</td>
    </tr>`
  ).join('');

  const customRows = (booking.customItems || []).map(i =>
    `<tr>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;">${i.itemName}${i.displayNote ? `<br><span style="color:#888;font-size:11px;">${i.displayNote}</span>` : ''}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${i.quantity}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;">${formatCurrency(i.unitPrice)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f0eee8;text-align:right;font-weight:600;">${formatCurrency(i.totalPrice)}</td>
    </tr>`
  ).join('');

  const paymentRows = payments.map(p =>
    `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #f0eee8;font-size:12px;">${formatDate(p.date || p.createdAt)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0eee8;font-size:12px;">${p.mode?.replace('_', ' ').toUpperCase() || '-'}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0eee8;font-size:12px;">${p.description || '-'}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0eee8;font-size:12px;text-align:right;font-weight:600;">${formatCurrency(p.amount)}</td>
    </tr>`
  ).join('');

  const hallRent = Number(booking.hall?.price || booking.hall?.cost || 0);
  const totalAmount = Number(booking.totalAmount || 0);
  const discount = Number(booking.discount || 0);
  const paidAmount = Number(booking.paidAmount || booking.advanceAmount || 0);
  const dueAmount = Number(booking.dueAmount || 0);

  const logoHtml = s.showLogo && s.logoUrl
    ? `<img src="${s.logoUrl}" style="max-height:60px;max-width:120px;object-fit:contain;" />`
    : `<div style="font-size:28px;font-weight:800;letter-spacing:2px;color:${s.themeColor};">${s.companyName?.charAt(0) || 'U'}</div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <title>Booking Receipt #${booking.bookingNo || booking.id || 'PENDING'}</title>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1a1a2e; background: #ffffff; line-height: 1.5; }
    .receipt-container { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
    .company-info { text-align: center; padding: 15px 35px; background: #fafafa; border-bottom: 1px solid #e8e6e0; }
    .company-info .logo { margin-bottom: 8px; }
    .company-info h2 { font-size: 18px; font-weight: 700; color: ${s.themeColor}; margin-bottom: 4px; }
    .company-info p { font-size: 11px; color: #666; line-height: 1.6; margin: 2px 0; }
    .receipt-header { background: linear-gradient(135deg, ${s.themeColor}, #2d2d44); padding: 30px 35px; color: #ffffff; display: flex; justify-content: space-between; align-items: center; }
    .receipt-header .brand h1 { font-size: 22px; font-weight: 700; letter-spacing: 1px; }
    .receipt-header .brand p { font-size: 12px; opacity: 0.7; margin-top: 4px; }
    .receipt-header .receipt-no { text-align: right; }
    .receipt-header .receipt-no .label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.6; }
    .receipt-header .receipt-no .number { font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 1px; }
    .receipt-body { padding: 30px 35px; }
    .info-box { background: #f8f7f4; border-radius: 8px; padding: 15px 18px; margin-bottom: 20px; }
    .info-box h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin-bottom: 8px; font-weight: 600; }
    .info-box .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .info-box .row .label { color: #666; }
    .info-box .row .value { font-weight: 600; color: #1a1a2e; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .items-table thead th { background: #f8f7f4; padding: 10px 14px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; border-bottom: 2px solid #e8e6e0; }
    .items-table tbody td { padding: 9px 14px; border-bottom: 1px solid #f0eee8; }
    .items-table tbody tr:last-child td { border-bottom: none; }
    .text-right { text-align: right; }
    .payment-summary { margin-top: 25px; border-top: 2px solid #e8e6e0; padding-top: 20px; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; }
    .summary-item { text-align: center; padding: 12px; border-radius: 8px; background: #f8f7f4; }
    .summary-item .label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #888; display: block; }
    .summary-item .amount { font-size: 16px; font-weight: 700; margin-top: 4px; }
    .summary-item.total .amount { color: #1a1a2e; }
    .summary-item.paid .amount { color: #2d7d46; }
    .summary-item.due .amount { color: #c0392b; }
    .summary-item.discount .amount { color: #2980b9; }
    .payment-history { margin-top: 20px; }
    .payment-history h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 10px; }
    .payment-history table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .payment-history table th { text-align: left; padding: 6px 10px; background: #f8f7f4; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
    .payment-history table td { padding: 6px 10px; border-bottom: 1px solid #f0eee8; }
    .receipt-footer { background: #f8f7f4; padding: 15px 35px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #e8e6e0; margin-top: 10px; }
    .receipt-footer strong { color: #666; }
    .no-print { text-align: center; margin: 20px 0 10px 0; }
    .no-print button { padding: 10px 30px; background: ${s.themeColor}; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600; margin: 0 5px; }
    .no-print button:hover { opacity: 0.9; }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt-container { box-shadow: none; border-radius: 0; }
      .receipt-header { background: ${s.themeColor} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .info-box { background: #f8f7f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .items-table thead th { background: #f8f7f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .summary-item { background: #f8f7f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .payment-history table th { background: #f8f7f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .receipt-footer { background: #f8f7f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    ${s.showCompanyName || s.showAddress || s.showPhone ? `
    <div class="company-info">
      <div class="logo">${logoHtml}</div>
      ${s.showCompanyName ? `<h2>${s.companyName}</h2>` : ''}
      ${s.showSlogan && s.companySlogan ? `<p style="font-style:italic;color:#888;margin-bottom:6px;">${s.companySlogan}</p>` : ''}
      ${s.showAddress && s.address ? `<p>📍 ${s.address}</p>` : ''}
      ${s.showPhone && s.phone ? `<p>📞 ${s.phone}</p>` : ''}
      ${s.showEmail && s.email ? `<p>✉️ ${s.email}</p>` : ''}
      ${s.showWebsite && s.website ? `<p>🌐 ${s.website}</p>` : ''}
      ${s.showGst && s.gstNumber ? `<p>GST: ${s.gstNumber}</p>` : ''}
      ${s.showNTN && s.ntnNumber ? `<p>NTN: ${s.ntnNumber}</p>` : ''}
    </div>
    ` : ''}

    <div class="receipt-header">
      <div class="brand">
        <h1>Booking Receipt</h1>
        <p>Premium Event & Hall Booking</p>
      </div>
      <div class="receipt-no">
        <div class="label">Booking #</div>
        <div class="number">${booking.bookingNo || booking.id || 'PENDING'}</div>
      </div>
    </div>

    <div class="receipt-body">
      <!-- ✅ Customer Details Only — NO Event Details -->
      ${s.showCustomerDetails ? `
      <div class="info-box">
        <h3>Customer Details</h3>
        <div class="row"><span class="label">Name</span><span class="value">${booking.guestName || 'N/A'}</span></div>
        <div class="row"><span class="label">Phone</span><span class="value">${booking.guestPhone || 'N/A'}</span></div>
        ${booking.guestEmail ? `<div class="row"><span class="label">Email</span><span class="value">${booking.guestEmail}</span></div>` : ''}
        ${booking.customer?.cnic ? `<div class="row"><span class="label">CNIC</span><span class="value">${booking.customer.cnic}</span></div>` : ''}
        ${booking.customer?.city ? `<div class="row"><span class="label">City</span><span class="value">${booking.customer.city}</span></div>` : ''}
      </div>
      ` : ''}

      <table class="items-table">
        <thead>
          <tr>
            <th>Item / Service</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${booking.hall ? `<tr>
            <td><strong>${booking.hallChargeMode === 'per_seat' ? `Hall Rent (×${booking.guestCount} guests)` : 'Hall Rent (Full Hall)'}</strong><br><span style="color:#888;font-size:11px;">${booking.hall.name || ''}</span></td>
            <td class="text-right">${booking.hallChargeMode === 'per_seat' ? (booking.guestCount || 0) : 1}</td>
            <td class="text-right">${formatCurrency(booking.hallChargeMode === 'per_seat' ? (booking.hall.perSeatPrice || booking.hall.price || 0) : (booking.hall.price || 0))}</td>
            <td class="text-right"><strong>${formatCurrency(hallRent)}</strong></td>
          </tr>` : ''}
          ${menuRows}
          ${customRows}
          ${serviceRows}
        </tbody>
      </table>

      <div class="payment-summary">
        <div class="summary-grid">
          <div class="summary-item total"><span class="label">Subtotal</span><span class="amount">${formatCurrency(totalAmount + discount)}</span></div>
          ${discount > 0 ? `<div class="summary-item discount"><span class="label">Discount</span><span class="amount">-${formatCurrency(discount)}</span></div>` : ''}
          <div class="summary-item paid"><span class="label">Grand Total</span><span class="amount">${formatCurrency(totalAmount)}</span></div>
          <div class="summary-item due"><span class="label">Due Balance</span><span class="amount">${formatCurrency(dueAmount)}</span></div>
        </div>
      </div>

      ${payments.length > 0 && s.showPaymentHistory ? `
        <div class="payment-history">
          <h4>Payment History</h4>
          <table>
            <thead><tr><th>Date</th><th>Mode</th><th>Description</th><th class="text-right">Amount</th></tr></thead>
            <tbody>${paymentRows}</tbody>
          </table>
        </div>
      ` : ''}

      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e8e6e0; display: flex; justify-content: space-between; font-size: 11px; color: #888;">
        <span>Payment Status: ${booking.paymentStatus || 'pending'}</span>
        <span>Generated: ${formatDateTime(new Date())}</span>
      </div>
    </div>

    <div class="receipt-footer">
      ${s.showHeaderText && s.headerText ? `<p style="margin-bottom:6px;font-weight:600;color:#444;">${s.headerText}</p>` : ''}
      <strong>${s.showFooterText && s.footerText ? s.footerText : 'Thank you for choosing us!'}</strong>
    </div>
  </div>

  <div class="no-print">
    <button onclick="window.print()">🖨️ Print A4</button>
    <button onclick="window.close()">❌ Close</button>
  </div>
</body>
</html>`;
};

export const generateThermalHTML = (booking, rawSettings = {}, formatCurrency) => {
  const s = { ...defaultSettings, ...rawSettings };

  const payments = booking.payments || [];
  const menuItems = (booking.menus || []).map(m =>
    `<tr>
      <td style="padding:2px 0;font-size:11px;">${m.menuName || m.name}</td>
      <td style="padding:2px 0;font-size:11px;text-align:center;">${m.quantity}</td>
      <td style="padding:2px 0;font-size:11px;text-align:right;">${formatCurrency(m.totalPrice)}</td>
    </tr>`
  ).join('');

  const serviceItems = (booking.services || []).map(sv =>
    `<tr>
      <td style="padding:2px 0;font-size:11px;">${sv.serviceName || sv.name}</td>
      <td style="padding:2px 0;font-size:11px;text-align:center;">${sv.quantity}</td>
      <td style="padding:2px 0;font-size:11px;text-align:right;">${formatCurrency(sv.totalPrice)}</td>
    </tr>`
  ).join('');

  const customItems = (booking.customItems || []).map(i =>
    `<tr>
      <td style="padding:2px 0;font-size:11px;">${i.itemName}</td>
      <td style="padding:2px 0;font-size:11px;text-align:center;">${i.quantity}</td>
      <td style="padding:2px 0;font-size:11px;text-align:right;">${formatCurrency(i.totalPrice)}</td>
    </tr>`
  ).join('');

  const paymentRows = payments.map(p =>
    `<tr>
      <td style="padding:2px 0;font-size:10px;">${formatDate(p.date || p.createdAt)}</td>
      <td style="padding:2px 0;font-size:10px;text-align:center;">${p.mode?.replace('_',' ').toUpperCase()}</td>
      <td style="padding:2px 0;font-size:10px;text-align:right;">${formatCurrency(p.amount)}</td>
    </tr>`
  ).join('');

  const hallRent = Number(booking.hall?.price || booking.hall?.cost || 0);
  const totalAmount = Number(booking.totalAmount || 0);
  const discount = Number(booking.discount || 0);
  const paidAmount = Number(booking.paidAmount || booking.advanceAmount || 0);
  const dueAmount = Number(booking.dueAmount || 0);

  const width = s.thermalWidth === '58mm' ? '58mm' : '80mm';
  const fontSize = s.thermalFontSize || '12px';

  const logoHtml = s.showLogo && s.logoUrl
    ? `<div style="text-align:center;margin-bottom:6px;"><img src="${s.logoUrl}" style="max-height:50px;max-width:100px;object-fit:contain;" /></div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <title>Thermal Receipt #${booking.bookingNo || booking.id || 'PENDING'}</title>
  <style>
    @page { size: ${width} auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: ${fontSize}; width: ${width}; margin: 0 auto; padding: 4px; color: #000; background: #fff; line-height: 1.3; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .double-divider { border-top: 2px solid #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    .info-line { display: flex; justify-content: space-between; font-size: 11px; }
    @media print { body { width: ${width}; margin: 0; padding: 4px; } .no-print { display: none; } }
    .no-print { text-align: center; margin: 10px 0; }
    .no-print button { padding: 8px 16px; background: #000; color: #fff; border: none; font-size: 12px; cursor: pointer; margin: 0 3px; }
  </style>
</head>
<body>
  ${logoHtml}
  ${s.showCompanyName ? `<div class="center" style="font-size:14px;font-weight:bold;">${s.companyName}</div>` : ''}
  ${s.showSlogan && s.companySlogan ? `<div class="center" style="font-size:10px;color:#333;">${s.companySlogan}</div>` : ''}
  ${s.showAddress && s.address ? `<div class="center" style="font-size:10px;">${s.address}</div>` : ''}
  ${s.showPhone && s.phone ? `<div class="center" style="font-size:10px;">Ph: ${s.phone}</div>` : ''}
  ${s.showEmail && s.email ? `<div class="center" style="font-size:10px;">${s.email}</div>` : ''}
  ${s.showGst && s.gstNumber ? `<div class="center" style="font-size:10px;">GST: ${s.gstNumber}</div>` : ''}
  ${s.showNTN && s.ntnNumber ? `<div class="center" style="font-size:10px;">NTN: ${s.ntnNumber}</div>` : ''}

  <div class="divider"></div>

  <div class="center bold" style="font-size:13px;">BOOKING RECEIPT</div>
  <div class="center" style="font-size:11px;">#${booking.bookingNo || booking.id || 'PENDING'}</div>

  <div class="divider"></div>

  <!-- ✅ Customer Only — NO Event Details -->
  ${s.showCustomerDetails ? `
  <div style="font-size:11px;font-weight:bold;margin-bottom:3px;">CUSTOMER</div>
  <div style="font-size:11px;">${booking.guestName || 'Walk-in'}</div>
  <div style="font-size:10px;">${booking.guestPhone || ''}</div>
  ${booking.guestEmail ? `<div style="font-size:10px;">${booking.guestEmail}</div>` : ''}
  <div class="divider"></div>
  ` : ''}

  <table>
    <thead>
      <tr style="font-size:10px;border-bottom:1px solid #000;">
        <th style="text-align:left;padding:2px 0;">Item</th>
        <th style="text-align:center;padding:2px 0;">Qty</th>
        <th style="text-align:right;padding:2px 0;">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${booking.hall ? `<tr>
        <td style="padding:2px 0;font-size:11px;">Hall: ${booking.hall.name || ''}</td>
        <td style="padding:2px 0;font-size:11px;text-align:center;">${booking.hallChargeMode === 'per_seat' ? (booking.guestCount || 0) : 1}</td>
        <td style="padding:2px 0;font-size:11px;text-align:right;">${formatCurrency(hallRent)}</td>
      </tr>` : ''}
      ${menuItems}
      ${customItems}
      ${serviceItems}
    </tbody>
  </table>

  <div class="double-divider"></div>

  <table>
    <tr class="info-line"><td style="font-size:11px;">Subtotal</td><td style="font-size:11px;text-align:right;font-weight:bold;">${formatCurrency(totalAmount + discount)}</td></tr>
    ${discount > 0 ? `<tr class="info-line"><td style="font-size:11px;">Discount</td><td style="font-size:11px;text-align:right;">-${formatCurrency(discount)}</td></tr>` : ''}
    <tr class="info-line"><td style="font-size:12px;font-weight:bold;">TOTAL</td><td style="font-size:12px;text-align:right;font-weight:bold;">${formatCurrency(totalAmount)}</td></tr>
    <tr class="info-line"><td style="font-size:11px;">Paid</td><td style="font-size:11px;text-align:right;">${formatCurrency(paidAmount)}</td></tr>
    <tr class="info-line"><td style="font-size:11px;">Due</td><td style="font-size:11px;text-align:right;font-weight:bold;">${formatCurrency(dueAmount)}</td></tr>
  </table>

  ${payments.length > 0 && s.showPaymentHistory ? `
    <div class="divider"></div>
    <div style="font-size:10px;font-weight:bold;margin-bottom:3px;">PAYMENTS</div>
    <table><tbody>${paymentRows}</tbody></table>
  ` : ''}

  <div class="double-divider"></div>

  <div class="center" style="font-size:10px;margin-top:6px;">
    ${s.showHeaderText && s.headerText ? `<div style="margin-bottom:4px;font-weight:bold;">${s.headerText}</div>` : ''}
    <div>Payment: ${booking.paymentStatus || 'pending'}</div>
    <div style="margin-top:4px;font-size:9px;">Generated: ${formatDateTime(new Date())}</div>
    ${s.showFooterText && s.footerText ? `<div style="margin-top:6px;border-top:1px dashed #000;padding-top:4px;">${s.footerText}</div>` : ''}
    ${s.showWebsite && s.website ? `<div style="font-size:9px;margin-top:2px;">${s.website}</div>` : ''}
  </div>

  <div class="no-print">
    <button onclick="window.print()">🖨️ Print Thermal</button>
    <button onclick="window.close()">❌ Close</button>
  </div>
</body>
</html>`;
};