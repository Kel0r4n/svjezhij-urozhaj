import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { SHOP_NAME } from '../constants/shop';

function NavLink({ to, children, onClick, className = '' }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`text-stone hover:text-accent transition-colors ${className}`}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate('/');
  };

  const cartLink = (
    <Link to="/cart" onClick={closeMenu} className="relative text-stone hover:text-accent transition-colors inline-flex">
      <span className="text-2xl" aria-hidden>🛒</span>
      <span className="sr-only">Корзина</span>
      {cartCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-accent text-white text-xs min-w-[1.25rem] h-5 px-1 rounded-full flex items-center justify-center font-medium">
          {cartCount}
        </span>
      )}
    </Link>
  );

  const authLinks = user ? (
    <>
      {cartLink}
      <NavLink to="/orders" onClick={closeMenu}>Заказы</NavLink>
      <NavLink to="/profile" onClick={closeMenu}>Профиль</NavLink>
      {user.is_admin && (
        <NavLink to="/admin" onClick={closeMenu} className="text-accent font-medium hover:opacity-80">
          Админка
        </NavLink>
      )}
      <button type="button" onClick={handleLogout} className="btn-secondary !px-4 !py-2 text-sm">
        Выйти
      </button>
    </>
  ) : (
    <>
      <NavLink to="/login" onClick={closeMenu}>Войти</NavLink>
      <Link to="/register" onClick={closeMenu} className="btn-primary !px-4 !py-2 text-sm">
        Регистрация
      </Link>
    </>
  );

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-sand sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="max-w-[90rem] mx-auto px-3 sm:px-8 py-3 sm:py-5">
        <div className="flex items-center justify-between gap-2 min-h-[2.5rem]">
          <Link
            to="/"
            onClick={closeMenu}
            className="text-lg sm:text-3xl font-bold text-stone hover:text-accent transition-colors truncate min-w-0 shrink"
          >
            {SHOP_NAME}
          </Link>

          {/* Десктоп */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6 shrink-0">
            <NavLink to="/">Каталог</NavLink>
            {authLinks}
          </div>

          {/* Мобильный: корзина + меню */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            {user && cartLink}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="btn-secondary !px-3 !py-2 text-sm min-w-[2.75rem]"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Мобильное меню */}
        {menuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-sand/60 flex flex-col gap-3 animate-fade-in pb-1">
            <NavLink to="/" onClick={closeMenu}>Каталог</NavLink>
            {user ? (
              <>
                <NavLink to="/orders" onClick={closeMenu}>Заказы</NavLink>
                <NavLink to="/profile" onClick={closeMenu}>Профиль</NavLink>
                {user.is_admin && (
                  <NavLink to="/admin" onClick={closeMenu} className="text-accent font-medium">
                    Админка
                  </NavLink>
                )}
                <button type="button" onClick={handleLogout} className="btn-secondary w-full !py-2 text-sm">
                  Выйти
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" onClick={closeMenu}>Войти</NavLink>
                <Link to="/register" onClick={closeMenu} className="btn-primary w-full !py-2 text-sm text-center">
                  Регистрация
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
