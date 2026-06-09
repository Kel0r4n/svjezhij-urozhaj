import { describe, it, expect } from 'vitest';
import { formatRuPhoneInput, normalizeRuPhone, extractRuPhoneDigits } from './phone';

describe('phone', () => {
  it('formats partial input', () => {
    expect(formatRuPhoneInput('+7 ')).toBe('+7 ');
    expect(formatRuPhoneInput('+7925')).toBe('+7 (925');
    expect(formatRuPhoneInput('+7925123')).toBe('+7 (925) 123');
    expect(formatRuPhoneInput('+79251234567')).toBe('+7 (925) 123 4567');
  });

  it('normalizes to E.164 RU', () => {
    expect(normalizeRuPhone('+7 (925) 123 4567')).toBe('+79251234567');
    expect(normalizeRuPhone('89251234567')).toBe('+79251234567');
  });

  it('strips leading 7/8 from national part', () => {
    expect(extractRuPhoneDigits('+79001234567')).toBe('9001234567');
  });
});
