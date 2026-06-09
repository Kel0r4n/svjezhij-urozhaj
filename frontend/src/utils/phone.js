/** Цифры национальной части (10 цифр без ведущей 7/8). */
export function extractRuPhoneDigits(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('8')) digits = digits.slice(1);
  if (digits.startsWith('7')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** Отображение: +7 (925) 123 4567 */
export function formatRuPhoneInput(value) {
  const digits = extractRuPhoneDigits(value);
  if (!digits) return '+7 ';

  if (digits.length <= 3) {
    return `+7 (${digits}`;
  }
  if (digits.length <= 6) {
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/** Для API: +79001234567 */
export function normalizeRuPhone(value) {
  const digits = extractRuPhoneDigits(value);
  if (digits.length !== 10) {
    throw new Error('Введите полный номер: +7 и 10 цифр');
  }
  return `+7${digits}`;
}

/** Минимальная длина отформатированного номера (полный). */
export function isRuPhoneComplete(value) {
  return extractRuPhoneDigits(value).length === 10;
}
