import { useState, useEffect } from 'react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import Spinner from '../components/Spinner';
import useDebounce from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoriesContext';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [category, setCategory] = useState('');
  const { user } = useAuth();
  const { categories } = useCategories();

  useEffect(() => {
    setLoading(true);
    api.getProducts(debouncedSearch || undefined, category || undefined)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch, category]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center mb-10 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Свежие фрукты и овощи</h1>
        <p className="text-stone/70 text-lg">Сочные ягоды, фрукты и овощи с доставкой</p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Поиск товаров..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-md mx-auto block"
        />
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-8">
        <button
          onClick={() => setCategory('')}
          className={`px-4 py-2 rounded-full text-sm transition-colors ${!category ? 'bg-accent text-white' : 'bg-sand hover:bg-warm'}`}
        >
          Все
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            onClick={() => setCategory(c.slug)}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${category === c.slug ? 'bg-accent text-white' : 'bg-sand hover:bg-warm'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner size="lg" />
      ) : products.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-6xl mb-4">🍒</div>
          <h2 className="text-xl font-semibold mb-2">Товаров пока нет</h2>
          <p className="text-stone/70">
            {user?.is_admin ? 'Добавьте товары через админ-панель' : 'Загляните позже — скоро появятся новинки!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
