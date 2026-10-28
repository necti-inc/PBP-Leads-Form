/** Practical email check — requires local@domain.tld shape. */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

/** Digits only; strips leading US country code 1 when present. */
export function normalizePhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

/** US phone: exactly 10 digits after normalizing. */
export function isValidPhone(value: string): boolean {
  return /^\d{10}$/.test(normalizePhoneDigits(value));
}

/** Formats as (951) 442-0992 while typing. */
export function formatPhoneInput(value: string): string {
  const digits = normalizePhoneDigits(value).slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function validateContactFields(email: string, phone: string): string | null {
  if (!isValidEmail(email)) {
    return "Enter a valid email address (example: name@email.com).";
  }
  if (!isValidPhone(phone)) {
    return "Enter a valid 10-digit US phone number.";
  }
  return null;
}
