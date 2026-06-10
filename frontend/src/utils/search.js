/** Умный поиск: без учёта регистра; цифры — подряд в строке. */

export function extractDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function smartMatch(text, query) {
  const hay = String(text || '');
  const q = String(query || '').trim();
  if (!q) return true;

  const qLower = q.toLowerCase();
  if (hay.toLowerCase().includes(qLower)) return true;

  const qDigits = extractDigits(q);
  if (qDigits) {
    const hayDigits = extractDigits(hay);
    if (hayDigits.includes(qDigits)) return true;
  }

  return false;
}
