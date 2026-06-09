import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { api } from '../api';
import ConfirmModal from '../components/ConfirmModal';
import SearchableSelect from '../components/SearchableSelect';
import Spinner from '../components/Spinner';
import ProductCircleImage from '../components/ProductCircleImage';
import toast from 'react-hot-toast';

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = String(d).split('T')[0].split('-');
  return new Date(+y, +m - 1, +day).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Cart() {
  const { items, total, loading, updateQuantity, removeItem, clearCart } = useCart();
  const [removeId, setRemoveId] = useState(null);
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ delivery_address_id: null, delivery_date_id: null });
  const [addresses, setAddresses] = useState([]);
  const [dates, setDates] = useState([]);
  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!checkout) return;
    setLoadingDelivery(true);
    Promise.all([api.getDeliveryAddresses(), api.getDeliveryDates()])
      .then(([addrs, dts]) => {
        setAddresses(addrs);
        setDates(dts);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoadingDelivery(false));
  }, [checkout]);

  const handleOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createOrder({
        delivery_address_id: form.delivery_address_id,
        delivery_date_id: form.delivery_date_id,
      });
      await clearCart();
      toast.success('Заказ оформлен!');
      navigate('/orders');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner size="lg" />;

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 animate-fade-in">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold mb-2">Корзина пуста</h2>
        <p className="text-stone/70 mb-6">Добавьте что-нибудь из каталога</p>
        <Link to="/" className="btn-primary inline-block">Перейти в каталог</Link>
      </div>
    );
  }

  const addressOptions = addresses.map((a) => ({ value: a.id, label: a.address }));
  const dateOptions = dates.map((d) => ({ value: d.id, label: formatDate(d.delivery_date) }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Корзина</h1>

      <div className="space-y-4 mb-8">
        {items.map((item) => (
          <div key={item.id} className="card p-4 flex gap-4 items-center animate-slide-up">
            <ProductCircleImage
              bgColor={item.product?.image_bg_color}
              imageUrl={item.product?.image_url}
              imageZoom={item.product?.image_zoom}
              imagePanX={item.product?.image_pan_x}
              imagePanY={item.product?.image_pan_y}
              size="thumb"
              className="w-20 h-20 rounded-soft shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{item.product?.name}</h3>
              <p className="text-accent font-medium">{item.product?.price?.toLocaleString('ru-RU')} ₽</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                className="w-8 h-8 rounded-full bg-sand hover:bg-warm transition-colors"
              >−</button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, Math.min(item.product?.stock || 99, item.quantity + 1))}
                className="w-8 h-8 rounded-full bg-sand hover:bg-warm transition-colors"
              >+</button>
            </div>
            <span className="font-bold hidden sm:block w-24 text-right">
              {((item.product?.price || 0) * item.quantity).toLocaleString('ru-RU')} ₽
            </span>
            <button onClick={() => setRemoveId(item.id)} className="text-red-400 hover:text-red-500 text-xl">×</button>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg">Итого:</span>
          <span className="text-2xl font-bold text-accent">{total.toLocaleString('ru-RU')} ₽</span>
        </div>

        {!checkout ? (
          <button onClick={() => setCheckout(true)} className="btn-primary w-full">
            Оформить заказ
          </button>
        ) : loadingDelivery ? (
          <Spinner />
        ) : (
          <form onSubmit={handleOrder} className="space-y-4 animate-slide-up">
            <div>
              <label className="block text-sm font-medium mb-1">Адрес доставки</label>
              {addressOptions.length === 0 ? (
                <p className="text-sm text-stone/60">Нет доступных адресов. Обратитесь к администратору.</p>
              ) : (
                <SearchableSelect
                  options={addressOptions}
                  value={form.delivery_address_id}
                  onChange={(v) => setForm({ ...form, delivery_address_id: v })}
                  placeholder="Выберите адрес"
                  required
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Дата доставки</label>
              {dateOptions.length === 0 ? (
                <p className="text-sm text-stone/60">Нет доступных дат доставки.</p>
              ) : (
                <SearchableSelect
                  options={dateOptions}
                  value={form.delivery_date_id}
                  onChange={(v) => setForm({ ...form, delivery_date_id: v })}
                  placeholder="Выберите дату"
                  required
                />
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setCheckout(false)} className="btn-secondary flex-1">
                Назад
              </button>
              <button
                type="submit"
                disabled={submitting || !form.delivery_address_id || !form.delivery_date_id}
                className="btn-primary flex-1"
              >
                {submitting ? 'Оформление...' : 'Подтвердить заказ'}
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmModal
        isOpen={!!removeId}
        title="Удалить товар?"
        message="Товар будет удалён из корзины"
        confirmText="Удалить"
        danger
        onConfirm={() => { removeItem(removeId); setRemoveId(null); }}
        onCancel={() => setRemoveId(null)}
      />
    </div>
  );
}
