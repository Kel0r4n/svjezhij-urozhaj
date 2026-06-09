import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import ProductCircleImage from './ProductCircleImage';

export default function ProductCard({ product }) {
  const { user } = useAuth();
  const { addItem } = useCart();
  const [qtyInput, setQtyInput] = useState('1');
  const [adding, setAdding] = useState(false);
  const outOfStock = product.stock === 0;
  const bgColor = product.image_bg_color || '#E6E0D4';

  const resolveQty = () => {
    const n = parseInt(qtyInput, 10);
    if (!n || n < 1) return 1;
    return Math.min(product.stock, n);
  };

  const handleQtyChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      setQtyInput('');
      return;
    }
    if (!/^\d+$/.test(raw)) return;
    const n = parseInt(raw, 10);
    if (n > product.stock) {
      setQtyInput(String(product.stock));
      return;
    }
    setQtyInput(raw);
  };

  const handleQtyBlur = () => {
    if (qtyInput === '') {
      setQtyInput('1');
      return;
    }
    const n = parseInt(qtyInput, 10);
    if (!n || n < 1) {
      setQtyInput('1');
    } else if (n > product.stock) {
      setQtyInput(String(product.stock));
    }
  };

  const handleAdd = async () => {
    const qty = resolveQty();
    setQtyInput(String(qty));
    setAdding(true);
    await addItem(product, qty);
    setAdding(false);
  };

  return (
    <div className="card overflow-hidden flex flex-col animate-slide-up">
      <ProductCircleImage
        bgColor={bgColor}
        imageUrl={product.image_url}
        imageZoom={product.image_zoom}
        imagePanX={product.image_pan_x}
        imagePanY={product.image_pan_y}
        size="card"
      />
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-semibold text-lg text-accent mb-2">{product.name}</h3>
        <p className="text-stone/70 text-sm mb-3 line-clamp-2 flex-1">{product.description}</p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xl font-bold text-accent">{product.price.toLocaleString('ru-RU')} ₽</span>
          <span className={`text-sm ${outOfStock ? 'text-red-400' : 'text-stone/60'}`}>
            {outOfStock ? 'Нет в наличии' : `В наличии: ${product.stock}`}
          </span>
        </div>

        {!outOfStock && user && (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              inputMode="numeric"
              value={qtyInput}
              onChange={handleQtyChange}
              onBlur={handleQtyBlur}
              className="input-field !w-16 !py-2 text-center"
              aria-label="Количество"
            />
            <button
              onClick={handleAdd}
              disabled={adding}
              className="btn-primary flex-1 !py-2 text-sm"
            >
              {adding ? '...' : 'В корзину'}
            </button>
          </div>
        )}

        {outOfStock && (
          <button disabled className="btn-primary w-full !py-2 text-sm opacity-50 cursor-not-allowed">
            Нет в наличии
          </button>
        )}

        {!user && !outOfStock && (
          <p className="text-sm text-stone/60 text-center">Войдите, чтобы купить</p>
        )}
      </div>
    </div>
  );
}
