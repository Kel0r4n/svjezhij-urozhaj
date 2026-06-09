import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import PhoneInput from '../components/PhoneInput';
import { isRuPhoneComplete, normalizeRuPhone } from '../utils/phone';

export default function Register() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    patronymic: '',
    phone: '+7 ',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isRuPhoneComplete(form.phone)) {
      toast.error('Введите полный номер: +7 и 10 цифр');
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, phone: normalizeRuPhone(form.phone) });
      toast.success('Регистрация успешна!');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="card p-8 animate-slide-up">
        <h1 className="text-2xl font-bold text-center mb-6">Регистрация</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Имя *</label>
              <input name="first_name" required value={form.first_name} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Фамилия *</label>
              <input name="last_name" required value={form.last_name} onChange={handleChange} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Отчество</label>
            <input name="patronymic" value={form.patronymic} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Телефон *</label>
            <PhoneInput
              name="phone"
              required
              value={form.phone}
              onChange={(phone) => setForm({ ...form, phone })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field" placeholder="необязательно" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Пароль *</label>
            <input name="password" type="password" required minLength={6} value={form.password} onChange={handleChange} className="input-field" />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Загрузка...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-accent hover:underline">Войти</Link>
        </p>
      </div>
    </div>
  );
}
