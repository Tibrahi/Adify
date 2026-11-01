import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Phone parsing/validation. A syntactically valid number is NOT proof of
// ownership; phone verification is a separate step when it is ever required.

export interface PhoneCheck {
  ok: boolean;
  e164: string;
  error: string;
}

export function validatePhone(raw: string, defaultCountry?: string): PhoneCheck {
  const value = raw.trim();
  if (!value) return { ok: false, e164: '', error: 'Phone number is required.' };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = parsePhoneNumberFromString(value, defaultCountry as any);
    if (!parsed || !parsed.isValid()) {
      return { ok: false, e164: '', error: 'Enter a valid phone number with country code.' };
    }
    return { ok: true, e164: parsed.number, error: '' };
  } catch {
    return { ok: false, e164: '', error: 'Enter a valid phone number with country code.' };
  }
}

export function formatPhoneInternational(raw: string, defaultCountry?: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = parsePhoneNumberFromString(raw.trim(), defaultCountry as any);
    return parsed ? parsed.formatInternational() : raw.trim();
  } catch {
    return raw.trim();
  }
}
