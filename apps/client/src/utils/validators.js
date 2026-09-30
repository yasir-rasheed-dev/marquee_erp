// Comprehensive list of standard valid Top-Level Domains (TLDs)
const VALID_TLDS = new Set([
  // Core generic TLDs
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
  // Popular generic TLDs
  'info', 'biz', 'name', 'pro', 'coop', 'aero', 'museum',
  'co', 'io', 'ai', 'me', 'app', 'dev', 'tech', 'online',
  'store', 'site', 'xyz', 'live', 'cloud', 'digital', 'global',
  'ltd', 'tv', 'cc', 'asia', 'club', 'design', 'agency',
  'email', 'media', 'network', 'software', 'systems', 'world',
  'space', 'shop', 'top', 'vip', 'icu', 'link', 'guru',
  'life', 'work', 'today', 'news', 'company', 'center', 'solutions',
  'expert', 'care', 'group', 'team', 'zone', 'fit', 'law',
  // Country-code top-level domains (ccTLDs)
  'pk', 'uk', 'us', 'ca', 'au', 'in', 'ae', 'sa', 'qa', 'kw',
  'bh', 'om', 'de', 'fr', 'it', 'es', 'nl', 'ch', 'se', 'no',
  'tr', 'ru', 'cn', 'jp', 'sg', 'my', 'nz', 'za', 'eg', 'bd',
  'np', 'lk', 'eu', 'ie', 'be', 'at', 'dk', 'fi', 'pt', 'pl'
]);

// Valid 2-level country extensions (e.g. .edu.pk, .com.pk, .co.uk)
const VALID_COMPOUND_TLDS = new Set([
  'com.pk', 'edu.pk', 'org.pk', 'gov.pk', 'net.pk', 'web.pk', 'fam.pk', 'biz.pk',
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'ltd.uk', 'net.uk',
  'co.in', 'net.in', 'org.in', 'gen.in', 'firm.in', 'ind.in', 'ac.in', 'edu.in', 'gov.in',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.nz', 'net.nz', 'org.nz', 'govt.nz', 'ac.nz',
  'com.sa', 'edu.sa', 'gov.sa', 'med.sa', 'org.sa', 'net.sa',
  'com.ae', 'net.ae', 'gov.ae', 'ac.ae', 'org.ae',
  'com.qa', 'edu.qa', 'gov.qa',
  'com.kw', 'edu.kw', 'gov.kw',
  'com.bh', 'edu.bh', 'gov.bh',
  'com.eg', 'edu.eg', 'gov.eg',
  'com.bd', 'edu.bd', 'gov.bd',
  'com.sg', 'edu.sg', 'gov.sg'
]);

/**
 * Strict email validation checking structure, valid domain, and real TLDs.
 * Rejects typos like .comm, .commmmm, .coom, etc.
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();

  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (!local || !domain) return false;

  // Local part checks
  if (local.length > 64) return false;
  if (!/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(local)) {
    return false;
  }

  // Domain part checks
  if (domain.length > 255 || domain.startsWith('.') || domain.endsWith('.') || domain.startsWith('-') || domain.endsWith('-')) {
    return false;
  }
  if (domain.includes('..')) return false;

  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;

  for (const part of domainParts) {
    if (!part || part.length > 63) return false;
    if (!/^[a-z0-9-]+$/.test(part)) return false;
    if (part.startsWith('-') || part.endsWith('-')) return false;
  }

  const lastPart = domainParts[domainParts.length - 1];
  const secondLastPart = domainParts.length >= 2 ? domainParts[domainParts.length - 2] : '';
  const compoundCandidate = `${secondLastPart}.${lastPart}`;

  const isCompoundValid = VALID_COMPOUND_TLDS.has(compoundCandidate);
  const isSingleTldValid = VALID_TLDS.has(lastPart);

  if (!isCompoundValid && !isSingleTldValid) {
    return false;
  }

  // Specific domain validations for major providers
  const baseDomain = domainParts[0];
  if (baseDomain === 'gmail') {
    if (domain !== 'gmail.com') return false;
  } else if (baseDomain === 'hotmail') {
    if (!['hotmail.com', 'hotmail.co.uk', 'hotmail.es', 'hotmail.fr', 'hotmail.it', 'hotmail.de'].includes(domain)) {
      return false;
    }
  } else if (baseDomain === 'yahoo') {
    if (!['yahoo.com', 'yahoo.co.uk', 'yahoo.com.pk', 'yahoo.ca', 'yahoo.in', 'yahoo.com.au'].includes(domain)) {
      return false;
    }
  } else if (baseDomain === 'outlook') {
    if (!['outlook.com', 'outlook.pk', 'outlook.sa'].includes(domain)) {
      return false;
    }
  } else if (baseDomain === 'icloud') {
    if (domain !== 'icloud.com') return false;
  }

  return true;
};

/**
 * Returns true if an email has been typed AND is invalid.
 * Empty/blank is NOT treated as invalid (for optional fields).
 */
export const isEmailInvalid = (email) => {
  if (!email || !String(email).trim()) return false;
  return !validateEmail(email);
};

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
