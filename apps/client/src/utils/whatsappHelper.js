// ═══════════════════════════════════════════════════════════
// utils/whatsappHelper.js
// 100% Free WhatsApp Web Integration (Zero API Cost)
// Reuses Dedicated Tab, Auto-formats Pakistani & International Numbers
// ═══════════════════════════════════════════════════════════

/**
 * Clean and format phone number for WhatsApp Web API
 * Handles 0307..., +92307..., 92307..., etc.
 */
export const formatWhatsAppPhone = (phone) => {
  if (!phone) return '';
  let clean = String(phone).replace(/[^0-9]/g, '');
  
  // If starts with 03 (e.g. 03077850656) -> replace leading 0 with 92
  if (clean.startsWith('03')) {
    clean = '92' + clean.substring(1);
  } else if (clean.startsWith('3') && clean.length === 10) {
    clean = '92' + clean;
  } else if (clean.startsWith('0092')) {
    clean = clean.substring(2);
  }
  return clean;
};

/**
 * 1. OPEN IN WHATSAPP DESKTOP APP (Zero Browser Tabs!)
 * Directly invokes Windows WhatsApp application via protocol handler.
 * Does not open ANY new tab in Chrome/Edge, and switches active chat in-app.
 */
export const openWhatsAppDesktop = ({ phone, message }) => {
  const cleanPhone = formatWhatsAppPhone(phone);
  const encoded = encodeURIComponent(message || '');
  const url = `whatsapp://send?phone=${cleanPhone}&text=${encoded}`;

  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  } catch (e) {
    window.location.assign(url);
  }
};

/**
 * 2. OPEN IN WHATSAPP WEB (Browser Tab)
 * Opens in a named tab 'MarqueeWhatsAppTab'
 */
export const openWhatsAppWeb = ({ phone, message }) => {
  const cleanPhone = formatWhatsAppPhone(phone);
  const encoded = encodeURIComponent(message || '');
  const url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;

  const waWindow = window.open(url, 'MarqueeWhatsAppTab');
  if (waWindow && typeof waWindow.focus === 'function') {
    waWindow.focus();
  }
  return waWindow;
};

/**
 * 3. COPY MESSAGE & DETAILS TO CLIPBOARD
 */
export const copyWhatsAppMessage = async ({ phone, message }) => {
  const cleanPhone = formatWhatsAppPhone(phone);
  const fullText = `Recipient: +${cleanPhone}\n\n${message}`;
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(fullText);
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = fullText;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

/**
 * Smart open function supporting both modes
 */
export const openWhatsApp = ({ phone, message, mode = 'desktop' }) => {
  if (mode === 'desktop') {
    return openWhatsAppDesktop({ phone, message });
  }
  return openWhatsAppWeb({ phone, message });
};

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return 'Rs. ' + num.toLocaleString('en-PK');
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(dateStr).substring(0, 10);
  }
};

/**
 * 1. UPCOMING EVENT REMINDER (Kal Function Hai / Event Reminder)
 */
export const generateReminderMessage = (booking, branch = {}) => {
  const customerName = booking.customer?.name || booking.guestName || 'Valued Customer';
  const branchName = branch?.name || "Raath G's Main Branch";
  const branchPhone = branch?.phone || '03077850656';
  const branchAddress = branch?.address || 'Jannat Shadi Hall, Lahore, Pakistan';
  const hallName = booking.hall?.name || 'Main Hall';
  const dateStr = formatDate(booking.eventDate);
  const timeStr = [booking.startTime, booking.endTime].filter(Boolean).join(' - ') || 'Event Time';
  const eventTitle = booking.title || booking.eventType || 'Wedding Function';

  return `*Assalam-o-Alaikum ${customerName}!* 🌟

Yeh aik reminder message hai *${branchName}* ki taraf se aapke aane wale event ke silsilay mein:

📋 *Booking No:* ${booking.bookingNo || '-'}
🎉 *Event:* ${eventTitle}
📅 *Event Date:* ${dateStr}
⏰ *Timings:* ${timeStr}
🏛️ *Hall / Venue:* ${hallName}
👥 *Expected Guests:* ${booking.guestCount || 0} Persons

💰 *Financial Summary:*
• Total Bill: ${formatCurrency(booking.totalAmount)}
• Advance Paid: ${formatCurrency(booking.paidAmount)}
• Remaining Balance Due: *${formatCurrency(booking.dueAmount)}*

Humari team aapke event ko yaadgar banane ke liye mukammal tayar hai. Kisi bhi tabdeeli, menu adjustments ya mazeed rahnumai ke liye barah-e-karam humare official number par rabta karein.

📞 *Official Contact:* ${branchPhone}
📍 *Address:* ${branchAddress}

_Shukriya wa JazakAllah!_
*${branchName} Management*`;
};

/**
 * 2. BOOKING CONFIRMATION & ADVANCE RECEIPT
 */
export const generateConfirmationMessage = (booking, branch = {}) => {
  const customerName = booking.customer?.name || booking.guestName || 'Valued Customer';
  const branchName = branch?.name || "Raath G's Main Branch";
  const branchPhone = branch?.phone || '03077850656';
  const branchAddress = branch?.address || 'Jannat Shadi Hall, Lahore, Pakistan';
  const hallName = booking.hall?.name || 'Main Hall';
  const dateStr = formatDate(booking.eventDate);

  return `*Assalam-o-Alaikum ${customerName}!* 🎉

Aapki booking *${branchName}* mein kamiyabi se darj kar li gayi hai. Tafseelat darj zail hain:

📋 *Booking No:* ${booking.bookingNo || '-'}
📅 *Event Date:* ${dateStr}
🏛️ *Hall:* ${hallName}
👥 *Guests:* ${booking.guestCount || 0} Persons

💰 *Payment Details:*
• Total Booking Amount: ${formatCurrency(booking.totalAmount)}
• Advance Received: *${formatCurrency(booking.paidAmount)}*
• Balance Due: ${formatCurrency(booking.dueAmount)}

Hum par aitemad karne ka bohot shukriya. Hum aapke event ko lajawab bananey ki poori koshish karenge.

📞 *Rabta Number:* ${branchPhone}
📍 *Address:* ${branchAddress}

*${branchName} Management*`;
};

/**
 * 3. EVENT COMPLETED — THANK YOU & FEEDBACK REQUEST
 */
export const generateFeedbackMessage = (booking, branch = {}) => {
  const customerName = booking.customer?.name || booking.guestName || 'Valued Customer';
  const branchName = branch?.name || "Raath G's Main Branch";
  const branchPhone = branch?.phone || '03077850656';
  const eventTitle = booking.title || booking.eventType || 'Event';
  const dateStr = formatDate(booking.eventDate);

  return `*Assalam-o-Alaikum ${customerName}!* 💐

*${branchName}* par apne ahem event (${eventTitle} - ${dateStr}) ka intekhab karne ka bohot bohot shukriya!

Umeed hai aap aur aapke tamam azeez mehmanon ka hamare sath tajurba nihayat pur-lutf aur shandar raha hoga.

⭐ *Aapka Feedback Hamare Liye Bohat Qeemti Hai:*
Barah-e-karam hamari food quality, hall ambiance aur staff services ke baray mein apna tajurba 1 se 5 stars me zaroor share karein:

⭐⭐⭐⭐⭐ (5 = Outstanding / Bohat Aala)

Aapki raye humein mazeed behtari ki taraf le jati hai. Future ke tamam shadi, walima aur family functions ke liye hum hamesha aapki khidmat mein hazir hain.

📞 *Official Contact:* ${branchPhone}

_Khush rahein aur duaon mein yaad rakhein!_
*${branchName} Team*`;
};

/**
 * 4. PAYMENT & DUE BALANCE REMINDER
 */
export const generatePaymentReminderMessage = (booking, branch = {}) => {
  const customerName = booking.customer?.name || booking.guestName || 'Valued Customer';
  const branchName = branch?.name || "Raath G's Main Branch";
  const branchPhone = branch?.phone || '03077850656';
  const dateStr = formatDate(booking.eventDate);

  return `*Assalam-o-Alaikum ${customerName}!* 💳

Yeh aik qadre yad-dihani (Payment Reminder) hai aapki booking (*${booking.bookingNo}*, Event Date: ${dateStr}) ke baqaya wajib-ul-ada balance ke hawalay se:

• Total Bill: ${formatCurrency(booking.totalAmount)}
• Paid Till Now: ${formatCurrency(booking.paidAmount)}
• *Remaining Balance Due:* *${formatCurrency(booking.dueAmount)}*

Barah-e-karam baqaya raqam Cash, Bank Transfer ya JazzCash/EasyPaisa ke zariye adaa farma kar slip share kar dein taake booking records update ho sakein.

📞 *Accounts Rabta:* ${branchPhone}

*${branchName} Accounts Department*`;
};
