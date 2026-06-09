import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    patronymic: user?.patronymic || '',
    phone: user?.phone || '',
    email: user?.email || '',
    telegram_username: user?.telegram_username || '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.patronymic) payload.patronymic = null;
      if (!payload.email) payload.email = null;
      if (!payload.telegram_username) payload.telegram_username = null;
      await updateProfile(payload);
      toast.success('Профиль обновлён');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="card p-8 animate-slide-up">
        <h1 className="text-2xl font-bold mb-6">Профиль</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Имя</label>
              <input name="first_name" required value={form.first_name} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Фамилия</label>
              <input name="last_name" required value={form.last_name} onChange={handleChange} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Отчество</label>
            <input name="patronymic" value={form.patronymic} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Телефон</label>
            <input name="phone" type="tel" required value={form.phone} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telegram username</label>
            <input name="telegram_username" value={form.telegram_username} onChange={handleChange} className="input-field" placeholder="@username" />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
      </div>
    </div>
  );
}
