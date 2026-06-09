import ProductCircleImage from './ProductCircleImage';

export default function ProductImageEditor({
  bgColor,
  imageUrl,
  imageZoom,
  imagePanX,
  imagePanY,
  onTransformChange,
  onFileSelect,
}) {
  return (
    <div className="space-y-3">
      <ProductCircleImage
        bgColor={bgColor}
        imageUrl={imageUrl}
        imageZoom={imageZoom}
        imagePanX={imagePanX}
        imagePanY={imagePanY}
        size="preview"
        className="w-48 h-48 rounded-soft mx-auto sm:mx-0"
        editable={!!imageUrl}
        onTransformChange={onTransformChange}
      />
      {imageUrl && (
        <div className="space-y-2 max-w-xs">
          <label className="text-xs text-stone/60 block">
            Перетащите фото в круге · колёсико мыши — приблизить/отдалить
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone/50 w-12">Масштаб</span>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.05"
              value={imageZoom ?? 1}
              onChange={(e) => onTransformChange({
                image_zoom: parseFloat(e.target.value),
                image_pan_x: imagePanX ?? 0,
                image_pan_y: imagePanY ?? 0,
              })}
              className="flex-1 accent-accent"
            />
            <span className="text-xs text-stone/50 w-10 text-right">{(imageZoom ?? 1).toFixed(1)}×</span>
          </div>
          <button
            type="button"
            onClick={() => onTransformChange({ image_zoom: 1, image_pan_x: 0, image_pan_y: 0 })}
            className="text-xs text-accent hover:underline"
          >
            Сбросить позицию
          </button>
        </div>
      )}
      <div>
        <input type="file" accept="image/*" onChange={(e) => onFileSelect(e.target.files?.[0] || null)} className="text-sm" />
        <p className="text-xs text-stone/50 mt-2">
          Загрузите фото — круг показывает, как оно будет выглядеть на карточке товара.
        </p>
      </div>
    </div>
  );
}
