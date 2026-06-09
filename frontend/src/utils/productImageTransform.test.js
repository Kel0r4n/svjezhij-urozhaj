import { describe, it, expect } from 'vitest';
import { clampZoom, clampPan, normalizeTransform } from './productImageTransform';

describe('clampZoom', () => {
  it('ограничивает zoom в диапазоне 0.5–4', () => {
    expect(clampZoom(0.1)).toBe(0.5);
    expect(clampZoom(10)).toBe(4);
    expect(clampZoom(2)).toBe(2);
  });
});

describe('normalizeTransform', () => {
  it('подставляет значения по умолчанию и клампит', () => {
    expect(normalizeTransform(null)).toEqual({ zoom: 1, panX: 0, panY: 0 });
    expect(normalizeTransform({ image_zoom: 99, image_pan_x: -200 })).toEqual({
      zoom: 4,
      panX: -100,
      panY: 0,
    });
  });
});
