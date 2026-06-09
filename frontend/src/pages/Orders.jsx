import { useState, useEffect } from 'react';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import Spinner from '../components/Spinner';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  created: 'Создан',
  confirmed: 'Подтверждён',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};

function formatDeliveryDate(d) {
  if (!d) return '';
  const [y, m, day] = String(d).split('T')[0].split('-');
  return new Date(+y, +m - 1, +day).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

const STATUS_COLORS = {
  created: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function Orders() {
  const { syncFromServer } = useCart();
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState(null);

  const load = (page = 1) => {
    setLoading(true);
    api.getOrders(page)
      .then(setData)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async () => {
    try {
      await api.cancelOrder(cancelId);
      toast.success('Заказ отменён');
      setCancelId(null);
      load(data.page);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRepeat = async (id) => {
    try {
      const res = await api.repeatOrder(id);
      await syncFromServer();
      if (res.added.length > 0) toast.success(`Добавлено ${res.added.length} товар(ов) в корзину`);
      if (res.skipped.length > 0) toast.error(`Нет в наличии: ${res.skipped.join(', ')}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Spinner size="lg" />;

  if (data.items.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 animate-fade-in">
        <div className="text-6xl mb-4">📋</div>
        <h2 className="text-2xl font-bold mb-2">Вы ещё ничего не заказали</h2>
        <p className="text-stone/70">Загляните в каталог и выберите что-нибудь уютное</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Мои заказы</h1>

      <div className="space-y-4">
        {data.items.map((order) => (
          <div key={order.id} className="card p-5 animate-slide-up">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <span className="font-semibold">Заказ №{order.id}</span>
                <span className="text-stone/60 text-sm ml-3">
                  {new Date(order.created_at).toLocaleString('ru-RU')}
                </span>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[order.status]}`}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>

            <p className="text-sm text-stone/70 mb-1">📍 {order.address}</p>
            <p className="text-sm text-stone/70 mb-3">
              📅 Доставка: {formatDeliveryDate(order.delivery_date)}
            </p>

            <div className="border-t border-sand pt-3 mb-3 space-y-1">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.product_name} × {item.quantity}</span>
                  <span>{(item.price * item.quantity).toLocaleString('ru-RU')} ₽</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-lg font-bold text-accent">
                Итого: {order.total.toLocaleString('ru-RU')} ₽
              </span>
              <div className="flex gap-2">
                <button onClick={() => handleRepeat(order.id)} className="btn-secondary !px-4 !py-2 text-sm">
                  Повторить заказ
                </button>
                {order.status === 'created' && (
                  <button onClick={() => setCancelId(order.id)} className="btn-danger !px-4 !py-2 text-sm">
                    Отменить
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => load(p)}
              className={`w-10 h-10 rounded-soft font-medium transition-colors ${
                p === data.page ? 'bg-accent text-white' : 'bg-sand hover:bg-warm'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!cancelId}
        title="Отменить заказ?"
        message="Заказ будет отменён, товары вернутся на склад"
        confirmText="Отменить заказ"
        danger
        onConfirm={handleCancel}
        onCancel={() => setCancelId(null)}
      />
    </div>
  );
}
