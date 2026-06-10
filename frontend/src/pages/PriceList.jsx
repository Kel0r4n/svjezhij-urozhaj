import { useEffect, useState } from 'react';
import { api } from '../api';
import { useCategories } from '../context/CategoriesContext';
import Spinner from '../components/Spinner';
import ProductCircleImage from '../components/ProductCircleImage';

export default function PriceList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { labels } = useCategories();

  useEffect(() => {
    api.getProducts()
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const byCategory = products.reduce((acc, p) => {
    const cat = p.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const handlePrint = () => window.print();

  if (loading) return <Spinner size="lg" />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 print:py-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 print:mb-4">
        <div>
          <h1 className="text-2xl font-bold">Прайс-лист</h1>
          <p className="text-stone/70 text-sm mt-1">Актуальные цены на {new Date().toLocaleDateString('ru-RU')}</p>
        </div>
        <button type="button" onClick={handlePrint} className="btn-secondary !py-2 !px-4 text-sm print:hidden">
          Печать / PDF
        </button>
      </div>

      <div className="space-y-8">
        {Object.entries(byCategory).map(([cat, items]) => (
          <section key={cat}>
            <h2 className="text-lg font-semibold mb-3 border-b border-sand pb-2">
              {labels[cat] || cat}
            </h2>
            <div className="space-y-2">
              {items.map((p) => (
                <div key={p.id} className="flex items-center gap-4 py-2 border-b border-sand/40 last:border-0">
                  <ProductCircleImage
                    bgColor={p.image_bg_color}
                    imageUrl={p.image_url}
                    imageZoom={p.image_zoom}
                    imagePanX={p.image_pan_x}
                    imagePanY={p.image_pan_y}
                    size="thumb"
                    className="w-12 h-12 rounded-soft shrink-0 print:hidden"
                  />
                  <span className="flex-1 font-medium">{p.name}</span>
                  <span className="font-bold text-accent whitespace-nowrap">
                    {p.price.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
