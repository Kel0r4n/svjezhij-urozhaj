const PLACEHOLDER = '/placeholder.svg';

export function productImageUrl(url) {
  if (!url) return PLACEHOLDER;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  return url;
}
