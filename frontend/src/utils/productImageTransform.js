export const IMAGE_TRANSFORM_DEFAULTS = { zoom: 1, panX: 0, panY: 0 };

export function clampZoom(z) {
  return Math.min(4, Math.max(0.5, z));
}

export function clampPan(v) {
  return Math.min(100, Math.max(-100, v));
}

export function normalizeTransform(product) {
  return {
    zoom: clampZoom(product?.image_zoom ?? 1),
    panX: clampPan(product?.image_pan_x ?? 0),
    panY: clampPan(product?.image_pan_y ?? 0),
  };
}
