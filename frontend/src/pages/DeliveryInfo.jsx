import { useEffect, useState } from 'react';
import { api } from '../api';
import SearchableSelect from '../components/SearchableSelect';
import Spinner from '../components/Spinner';

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = String(d).split('T')[0].split('-');
  return new Date(+y, +m - 1, +day).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DeliveryInfo() {
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDeliveryAddresses()
      .then(setAddresses)
      .catch(() => setAddresses([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!addressId) {
      setUpcoming([]);
      return;
    }
    setLoading(true);
    api.getDeliveryUpcoming(addressId)
      .then(setUpcoming)
      .catch(() => setUpcoming([]))
      .finally(() => setLoading(false));
  }, [addressId]);

  const options = addresses.map((a) => ({ value: a.id, label: a.address }));

  return (
    <div className="max-w-xl mx-auto px-4 py-10 animate-fade-in">
      <h1 className="text-2xl font-bold mb-2 text-center">Когда доставка?</h1>
      <p className="text-stone/70 text-center mb-8">Выберите ваш адрес — покажем ближайшие даты и время</p>

      <div className="card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Адрес доставки</label>
          {options.length === 0 ? (
            <p className="text-sm text-stone/60">Адреса пока не настроены</p>
          ) : (
            <SearchableSelect
              options={options}
              value={addressId}
              onChange={setAddressId}
              placeholder="Выберите ЖК или район"
            />
          )}
        </div>

        {loading && addressId && <Spinner />}

        {!loading && addressId && upcoming.length === 0 && (
          <p className="text-sm text-stone/70 text-center">Расписание для этого адреса пока не задано</p>
        )}

        {!loading && upcoming.length > 0 && (
          <div className="space-y-3">
            {upcoming.map((slot, i) => (
              <div
                key={`${slot.date}-${slot.time}`}
                className={`rounded-soft border p-4 ${i === 0 ? 'border-accent/40 bg-accent/10' : 'border-sand/60 bg-cream/40'}`}
              >
                <p className="font-medium">
                  {i === 0 ? 'Ближайшая: ' : ''}
                  {slot.weekday_label}, {formatDate(slot.date)}
                </p>
                <p className="text-sm text-stone mt-1">Около {slot.time}</p>
                {slot.notice && (
                  <p className="text-sm mt-2 text-amber-900/90 bg-amber-50 rounded-soft px-3 py-2">⚠️ {slot.notice}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
