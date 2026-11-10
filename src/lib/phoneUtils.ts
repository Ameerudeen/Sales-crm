import { PHONE_CODES } from '../constants';

/**
 * Splits a phone number into its country code and the remaining number.
 * Uses the PHONE_CODES constant to find the longest matching code.
 */
export const splitPhone = (phone: string) => {
  if (!phone) return { code: '', number: '' };
  
  // If it doesn't start with +, it has no code
  if (!phone.startsWith('+')) return { code: '', number: phone };
  
  // Try to match against known phone codes, descending by length for the best match
  const sortedCodes = Object.values(PHONE_CODES).sort((a, b) => b.length - a.length);
  for (const code of sortedCodes) {
    if (phone.startsWith(code)) {
      return { code, number: phone.slice(code.length) };
    }
  }
  
  // Fallback: match + followed by 1 to 4 digits if no known code matches
  const match = phone.match(/^(\+\d{1,4})/);
  if (match) {
    return { code: match[1], number: phone.slice(match[1].length) };
  }
  
  return { code: '', number: phone };
};
