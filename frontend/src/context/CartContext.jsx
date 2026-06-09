import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CartContext = createContext(null);
const LOCAL_KEY = 'cart_items';

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadLocalCart = () => {
    try {
      const saved = localStorage.getItem(LOCAL_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const saveLocalCart = (cartItems) => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(cartItems));
  };

  const syncFromServer = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.getCart();
      setItems(data);
      saveLocalCart(data.map((i) => ({ product_id: i.product_id, quantity: i.quantity })));
    } catch {
      // keep local
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      syncFromServer();
    } else {
      const local = loadLocalCart();
      setItems(local.map((i) => ({ ...i, product: null })));
    }
  }, [user, syncFromServer]);

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const addItem = async (product, quantity = 1) => {
    if (!user) {
      toast.error('Войдите, чтобы добавить в корзину');
      return;
    }
    try {
      const data = await api.addToCart({ product_id: product.id, quantity });
      await syncFromServer();
      toast.success(`${product.name} добавлен в корзину`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      await api.updateCartItem(itemId, { quantity });
      await syncFromServer();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeItem = async (itemId) => {
    try {
      await api.removeCartItem(itemId);
      await syncFromServer();
      toast.success('Товар удалён из корзины');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const clearCart = async () => {
    if (user) {
      await api.clearCart();
    }
    setItems([]);
    saveLocalCart([]);
  };

  const total = items.reduce((sum, i) => {
    const price = i.product?.price || 0;
    return sum + price * i.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ items, cartCount, total, loading, addItem, updateQuantity, removeItem, clearCart, syncFromServer }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
