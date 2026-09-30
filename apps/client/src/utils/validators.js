export const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const normalizePhone = (phone) => {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '').slice(0, 11);
};

export const validatePhone = (phone) => {
  if (!phone) return true;
  const digits = String(phone).replace(/\D/g, '');
  return digits.length === 11;
};
