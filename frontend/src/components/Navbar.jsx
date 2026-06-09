import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { SHOP_NAME } from '../constants/shop';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-sand sticky top-0 z-40">
      <div className="max-w-[90rem] mx-auto px-3 sm:px-8 py-5 flex items-center justify-between">
        <Link
          to="/"
          className="text-2xl sm:text-3xl font-bold text-stone hover:text-accent transition-colors -ml-1 sm:ml-0"
        >
          {SHOP_NAME}
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <Link to="/" className="text-stone hover:text-accent transition-colors hidden sm:block">
            Каталог
          </Link>

          {user ? (
            <>
              <Link to="/cart" className="relative text-stone hover:text-accent transition-colors">
                <span className="text-2xl">🛒</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                    {cartCount}
                  </span>
                )}
              </Link>
              <Link to="/orders" className="text-stone hover:text-accent transition-colors hidden sm:block">
                Заказы
              </Link>
              <Link to="/profile" className="text-stone hover:text-accent transition-colors hidden sm:block">
                Профиль
              </Link>
              {user.is_admin && (
                <Link to="/admin" className="text-accent font-medium hover:opacity-80 transition-colors">
                  Админка
                </Link>
              )}
              <button onClick={handleLogout} className="btn-secondary !px-4 !py-2 text-sm">
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-stone hover:text-accent transition-colors">
                Войти
              </Link>
              <Link to="/register" className="btn-primary !px-4 !py-2 text-sm">
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
