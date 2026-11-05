/** What a typed phone number may contain: digits, spaces, dashes, dots, parentheses and a leading +. */
const PHONE_CHARACTERS = /^\+?[\d\s().-]+$/;

/**
 * The 10 digits of a US phone number, or null if `value` isn't one. Accepts 10 digits, or 11 starting
 * with the country code 1 (required after a leading +), like the platform's `PhoneNumbers.fromString`.
 */
export function usPhoneDigits(value: string): string | null {
  const trimmed = value.trim();
  if (!PHONE_CHARACTERS.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  if (digits.length === 10 && !trimmed.startsWith('+')) return digits;
  return null;
}

/**
 * `value` in the format the platform stores `person:mobileNumber` in, "(555) 123-4567"
 * (`PersonDAOImpl` reformats every saved number this way), or null if it isn't a US phone number.
 */
export function formatPhoneNumber(value: string): string | null {
  const digits = usPhoneDigits(value);
  return digits && `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
