import { useRef, useCallback } from 'react';
import { productImageUrl } from '../utils/images';
import { clampZoom, clampPan, normalizeTransform } from '../utils/productImageTransform';

const SIZES = {
  card: { circle: '76%' },
  thumb: { circle: '88%' },
  preview: { circle: '76%' },
};

function CircleImage({ src, zoom, panX, panY }) {
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="absolute left-1/2 top-1/2 w-full h-full object-cover select-none"
      style={{
        transform: `translate(calc(-50% + ${panX}%), calc(-50% + ${panY}%)) scale(${zoom})`,
        transformOrigin: 'center center',
      }}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );
}

export default function ProductCircleImage({
  bgColor = '#E6E0D4',
  imageUrl,
  imageZoom,
  imagePanX,
  imagePanY,
  size = 'card',
  className = '',
  editable = false,
  onTransformChange,
}) {
  const { circle } = SIZES[size] || SIZES.card;
  const src = imageUrl ? productImageUrl(imageUrl) : null;
  const { zoom, panX, panY } = normalizeTransform({
    image_zoom: imageZoom,
    image_pan_x: imagePanX,
    image_pan_y: imagePanY,
  });

  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const circleRef = useRef(null);

  const emit = useCallback((next) => {
    onTransformChange?.({
      image_zoom: clampZoom(next.zoom ?? zoom),
      image_pan_x: clampPan(next.panX ?? panX),
      image_pan_y: clampPan(next.panY ?? panY),
    });
  }, [onTransformChange, zoom, panX, panY]);

  const onPointerDown = (e) => {
    if (!editable || !src) return;
    e.preventDefault();
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!editable || !dragging.current || !circleRef.current) return;
    const w = circleRef.current.offsetWidth;
    const h = circleRef.current.offsetHeight;
    const dx = ((e.clientX - last.current.x) / w) * 100;
    const dy = ((e.clientY - last.current.y) / h) * 100;
    last.current = { x: e.clientX, y: e.clientY };
    emit({ panX: panX + dx, panY: panY + dy });
  };

  const onPointerUp = (e) => {
    dragging.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* */ }
  };

  const onWheel = (e) => {
    if (!editable || !src) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    emit({ zoom: clampZoom(zoom + delta) });
  };

  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${size === 'card' ? 'aspect-square w-full' : ''} ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <div
        ref={circleRef}
        className={`rounded-full overflow-hidden shrink-0 relative ${editable && src ? 'cursor-grab active:cursor-grabbing ring-2 ring-accent/40' : ''}`}
        style={{
          width: circle,
          aspectRatio: '1',
          backgroundColor: src ? '#ffffff' : 'rgba(255, 255, 255, 0.35)',
          touchAction: editable ? 'none' : 'auto',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
      >
        {src && <CircleImage src={src} zoom={zoom} panX={panX} panY={panY} />}
      </div>
    </div>
  );
}
