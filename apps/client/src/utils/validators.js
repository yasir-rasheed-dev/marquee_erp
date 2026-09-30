export const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * Format Pakistani Phone / Mobile / PTCL numbers:
 * - Mobile SIM (03XX): 4 digits - 7 digits => 0303-1234567 (11 digits, 12 chars)
 * - PTCL / Landline (04X, 02X, etc.): 3 digits - 8 digits => 042-12345678 (11 digits, 12 chars)
 */
export const formatPhone = (val) => {
  if (!val) return '';
  let digits = String(val).replace(/\D/g, '');

  // Auto-convert international prefix 92... to 0...
  if (digits.startsWith('92') && digits.length >= 3) {
    digits = '0' + digits.slice(2);
  }

  digits = digits.slice(0, 11);
  if (!digits) return '';

  // Mobile numbers starting with 03 (e.g. 0300, 0303, 0321, 0345)
  if (digits.startsWith('03')) {
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  // Landline / PTCL numbers starting with 0 and not 3 (e.g. 042, 021, 051, 041)
  if (digits.startsWith('0')) {
    if (digits.length <= 3) return digits;
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  // Generic fallback if no leading 0
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
};

/**
 * Format Pakistani CNIC:
 * 5 digits - 7 digits - 1 digit => 31203-4256351-7 (13 digits, 15 chars)
 */
export const formatCnic = (val) => {
  if (!val) return '';
  const digits = String(val).replace(/\D/g, '').slice(0, 13);
  if (!digits) return '';

  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
};

export const normalizePhone = (phone) => {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '').slice(0, 11);
};

export const validatePhone = (phone) => {
  if (!phone) return true;
  const digits = String(phone).replace(/\D/g, '');
  return digits.length === 11;
};

export const normalizeCnic = (cnic) => {
  if (!cnic) return '';
  return String(cnic).replace(/\D/g, '').slice(0, 13);
};

export const validateCnic = (cnic) => {
  if (!cnic) return true;
  const digits = String(cnic).replace(/\D/g, '');
  return digits.length === 13;
};
