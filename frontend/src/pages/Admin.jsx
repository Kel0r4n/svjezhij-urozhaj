import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ConfirmModal from '../components/ConfirmModal';
import SalesChart from '../components/SalesChart';
import DayDetailChart from '../components/DayDetailChart';
import ColorField from '../components/ColorField';
import ProductCircleImage from '../components/ProductCircleImage';
import ProductImageEditor from '../components/ProductImageEditor';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'dashboard', label: 'Дашборд' },
  { id: 'products', label: 'Товары' },
  { id: 'categories', label: 'Категории' },
  { id: 'addresses', label: 'Адреса' },
  { id: 'dates', label: 'Даты доставки' },
  { id: 'orders', label: 'Заказы' },
  { id: 'users', label: 'Пользователи' },
  { id: 'stock', label: 'Склад' },
];

const STATUS_OPTIONS = ['created', 'confirmed', 'delivered', 'cancelled'];
const STATUS_LABELS = { created: 'Создан', confirmed: 'Подтверждён', delivered: 'Доставлен', cancelled: 'Отменён' };

const emptyProduct = {
  name: '', price: '', description: '', category: '', stock: 0, is_active: true,
  image_bg_color: '#E6E0D4', image_zoom: 1, image_pan_x: 0, image_pan_y: 0,
};
const emptyCategory = { slug: '', label: '', chart_color: '#A8B5A0', sort_order: 0 };

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = String(d).split('T')[0].split('-');
  return new Date(+y, +m - 1, +day).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatChartDay(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Admin() {
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [filterCategories, setFilterCategories] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);

  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [productForm, setProductForm] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [deleteProductId, setDeleteProductId] = useState(null);

  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState('');

  const [deliveryDates, setDeliveryDates] = useState([]);
  const [newDate, setNewDate] = useState('');

  const [orders, setOrders] = useState({ items: [], page: 1, pages: 1 });
  const [orderFilter, setOrderFilter] = useState({ status: '', search: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  const [stockItems, setStockItems] = useState([]);

  const [adminCategories, setAdminCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState(null);

  const loadSalesAnalytics = useCallback(() => {
    api.getSalesAnalytics({ days: analyticsDays, categories: filterCategories })
      .then(setSalesData)
      .catch((e) => toast.error(e.message));
  }, [analyticsDays, filterCategories]);

  const loadDayDetail = useCallback((day) => {
    api.getDayDetail(day, filterCategories)
      .then(setDayDetail)
      .catch((e) => toast.error(e.message));
  }, [filterCategories]);

  const loadDashboard = () => {
    setLoading(true);
    api.getDashboard().then(setStats).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  };

  const loadProducts = () => {
    setLoading(true);
    api.getProducts(productSearch || undefined, undefined, true)
      .then(setProducts)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  const loadAddresses = () => {
    setLoading(true);
    api.getAdminAddresses()
      .then(setAddresses)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  const loadDeliveryDates = () => {
    setLoading(true);
    api.getAdminDeliveryDates()
      .then(setDeliveryDates)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  const loadOrders = (page = 1) => {
    setLoading(true);
    const params = { page };
    if (orderFilter.status) params.status = orderFilter.status;
    if (orderFilter.search) params.search = orderFilter.search;
    api.getAdminOrders(params)
      .then(setOrders)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  const loadUsers = () => {
    setLoading(true);
    api.getUsers(userSearch || undefined)
      .then(setUsers)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  const loadAdminCategories = () => {
    setLoading(true);
    api.getAdminCategories()
      .then(setAdminCategories)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  const loadStock = () => {
    setLoading(true);
    api.getProducts(undefined, undefined, true)
      .then((data) => setStockItems(data.map((p) => ({ product_id: p.id, name: p.name, stock: p.stock }))))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    if (tab === 'dashboard') loadDashboard();
    if (tab === 'products') { loadProducts(); loadAdminCategories(); }
    if (tab === 'categories') loadAdminCategories();
    if (tab === 'dashboard') loadAdminCategories();
    if (tab === 'addresses') loadAddresses();
    if (tab === 'dates') loadDeliveryDates();
    if (tab === 'orders') loadOrders();
    if (tab === 'users') loadUsers();
    if (tab === 'stock') loadStock();
  }, [tab]);

  useEffect(() => {
    if (tab === 'dashboard') loadSalesAnalytics();
  }, [tab, loadSalesAnalytics]);

  useEffect(() => {
    if (selectedDay) loadDayDetail(selectedDay);
    else setDayDetail(null);
  }, [selectedDay, loadDayDetail]);

  const handleDayClick = (day) => {
    setSelectedDay((prev) => (prev === day ? null : day));
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    const data = {
      name: productForm.name,
      price: parseFloat(productForm.price),
      description: productForm.description,
      category: productForm.category,
      stock: parseInt(productForm.stock),
      is_active: productForm.is_active !== false,
      image_bg_color: productForm.image_bg_color || '#E6E0D4',
      image_zoom: productForm.image_zoom ?? 1,
      image_pan_x: productForm.image_pan_x ?? 0,
      image_pan_y: productForm.image_pan_y ?? 0,
    };
    try {
      let productId = productForm.id;
      if (productForm.id) {
        await api.updateProduct(productForm.id, data);
        toast.success('Товар обновлён');
      } else {
        const created = await api.createProduct(data);
        productId = created.id;
        toast.success('Товар создан');
      }
      if (imageFile && productId) {
        await api.uploadProductImage(productId, imageFile);
        toast.success('Изображение загружено');
      }
      setProductForm(null);
      setImageFile(null);
      setImagePreview(null);
      loadProducts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleProductActive = async (p) => {
    try {
      await api.updateProduct(p.id, { is_active: !p.is_active });
      toast.success(p.is_active ? 'Товар скрыт' : 'Товар показан');
      loadProducts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteProduct = async () => {
    try {
      await api.deleteProduct(deleteProductId);
      toast.success('Товар удалён');
      setDeleteProductId(null);
      loadProducts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    try {
      if (categoryForm.id) {
        await api.updateCategory(categoryForm.id, {
          label: categoryForm.label,
          chart_color: categoryForm.chart_color,
          sort_order: +categoryForm.sort_order || 0,
          is_active: categoryForm.is_active !== false,
        });
        toast.success('Категория обновлена');
      } else {
        await api.createCategory({
          slug: categoryForm.slug,
          label: categoryForm.label,
          chart_color: categoryForm.chart_color,
          sort_order: +categoryForm.sort_order || 0,
        });
        toast.success('Категория создана');
      }
      setCategoryForm(null);
      loadAdminCategories();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      await api.createAddress(newAddress);
      setNewAddress('');
      toast.success('Адрес добавлен');
      loadAddresses();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddDate = async (e) => {
    e.preventDefault();
    try {
      await api.createDeliveryDate(newDate);
      setNewDate('');
      toast.success('Дата добавлена');
      loadDeliveryDates();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStatusChange = async (orderId, status) => {
    try {
      await api.updateOrderStatus(orderId, status);
      toast.success('Статус обновлён');
      loadOrders(orders.page);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleAdmin = async (userId) => {
    try {
      await api.toggleAdmin(userId);
      toast.success('Права обновлены');
      loadUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveStock = async () => {
    try {
      await api.bulkUpdateStock(stockItems.map((i) => ({ product_id: i.product_id, stock: i.stock })));
      toast.success('Склад обновлён');
      loadStock();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Админ-панель</h1>

      <div className="flex flex-wrap gap-2 mb-8">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-soft font-medium transition-all duration-300 ${
              tab === t.id ? 'bg-accent text-white' : 'bg-sand hover:bg-warm'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <Spinner />}

      {tab === 'dashboard' && stats && !loading && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="text-stone/70 text-sm">Заказов сегодня</p>
              <p className="text-2xl font-bold text-accent">{stats.orders_today}</p>
            </div>
            <div className="card p-5">
              <p className="text-stone/70 text-sm">Заказов за неделю</p>
              <p className="text-2xl font-bold text-accent">{stats.orders_week}</p>
            </div>
            <div className="card p-5">
              <p className="text-stone/70 text-sm">Общая выручка</p>
              <p className="text-2xl font-bold text-accent">{stats.total_revenue.toLocaleString('ru-RU')} ₽</p>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <h3 className="font-semibold text-lg">Продажи по дням</h3>
                <p className="text-sm text-stone/60 mt-1">Нажмите на день для детализации по товарам</p>
              </div>
              <select value={analyticsDays} onChange={(e) => { setSelectedDay(null); setAnalyticsDays(+e.target.value); }} className="input-field !w-auto !py-2 text-sm">
                <option value={7}>7 дней</option>
                <option value={14}>14 дней</option>
                <option value={30}>30 дней</option>
                <option value={60}>60 дней</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="text-sm font-medium text-stone/70 mb-2 block">Фильтр по категориям</label>
              <div className="flex flex-wrap gap-2">
                {adminCategories.filter((c) => c.is_active).map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => { setFilterCategories((prev) => prev.includes(c.slug) ? prev.filter((x) => x !== c.slug) : [...prev, c.slug]); setSelectedDay(null); }}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${filterCategories.includes(c.slug) ? 'bg-accent text-white' : 'bg-sand hover:bg-warm'}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {salesData && (
              <SalesChart data={salesData} onDayClick={handleDayClick} selectedDay={selectedDay} />
            )}

            {selectedDay && dayDetail && (
              <div className="mt-8 pt-6 border-t border-sand animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">
                    Детализация за {formatChartDay(selectedDay)} — {dayDetail.total.toLocaleString('ru-RU')} ₽
                  </h4>
                  <button onClick={() => setSelectedDay(null)} className="text-sm text-accent hover:underline">
                    Закрыть
                  </button>
                </div>
                <DayDetailChart data={dayDetail} />
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="font-semibold mb-4">Топ-5 товаров</h3>
            {stats.top_products.length === 0 ? (
              <p className="text-stone/60">Пока нет данных</p>
            ) : (
              <div className="space-y-2">
                {stats.top_products.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{i + 1}. {p.name}</span>
                    <span>{p.sold} шт — {p.revenue.toLocaleString('ru-RU')} ₽</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'products' && !loading && (
        <div className="animate-fade-in">
          <div className="flex flex-wrap gap-3 mb-6">
            <input placeholder="Поиск по названию..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="input-field max-w-xs" />
            <button onClick={loadProducts} className="btn-secondary !px-4 !py-2">Найти</button>
            <button onClick={() => { setProductForm({ ...emptyProduct }); setImageFile(null); setImagePreview(null); }} className="btn-primary !px-4 !py-2 ml-auto">
              + Добавить товар
            </button>
          </div>

          {productForm && (
            <form onSubmit={saveProduct} className="card p-6 mb-6 space-y-4 animate-slide-up">
              <h3 className="font-semibold">{productForm.id ? 'Редактировать' : 'Новый товар'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input placeholder="Название" required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="input-field" />
                <input placeholder="Цена" type="number" step="0.01" required value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} className="input-field" />
                <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} className="input-field" required>
                  <option value="">Выберите категорию</option>
                  {adminCategories.filter((c) => c.is_active).map((c) => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                </select>
                <input placeholder="Stock" type="number" required value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} className="input-field" />
                <div className="col-span-2">
                  <ColorField
                    label="Цвет фона картинки"
                    value={productForm.image_bg_color}
                    onChange={(v) => setProductForm({ ...productForm, image_bg_color: v })}
                  />
                </div>
                <label className="flex items-center gap-2 col-span-2">
                  <input type="checkbox" checked={productForm.is_active !== false} onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })} />
                  <span className="text-sm">Показывать в каталоге</span>
                </label>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Фото в кружке</label>
                  <ProductImageEditor
                    bgColor={productForm.image_bg_color || '#E6E0D4'}
                    imageUrl={imagePreview || productForm.image_url}
                    imageZoom={productForm.image_zoom}
                    imagePanX={productForm.image_pan_x}
                    imagePanY={productForm.image_pan_y}
                    onTransformChange={(t) => setProductForm({
                      ...productForm,
                      image_zoom: t.image_zoom,
                      image_pan_x: t.image_pan_x,
                      image_pan_y: t.image_pan_y,
                    })}
                    onFileSelect={(file) => {
                      setImageFile(file);
                      if (file) {
                        setProductForm((f) => ({
                          ...f,
                          image_zoom: 1,
                          image_pan_x: 0,
                          image_pan_y: 0,
                        }));
                      }
                    }}
                  />
                </div>
              </div>
              <textarea placeholder="Описание" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} className="input-field" rows={3} />
              <div className="flex gap-3">
                <button type="submit" className="btn-primary !px-4 !py-2">Сохранить</button>
                <button type="button" onClick={() => { setProductForm(null); setImageFile(null); }} className="btn-secondary !px-4 !py-2">Отмена</button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full card">
              <thead>
                <tr className="border-b border-sand text-left text-sm">
                  <th className="p-4">Фото</th>
                  <th className="p-4">Название</th>
                  <th className="p-4">Категория</th>
                  <th className="p-4">Цена</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Статус</th>
                  <th className="p-4">Действия</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={`border-b border-sand/50 hover:bg-sand/20 transition-colors ${!p.is_active ? 'opacity-50' : ''}`}>
                    <td className="p-4">
                      <ProductCircleImage
                        bgColor={p.image_bg_color}
                        imageUrl={p.image_url}
                        imageZoom={p.image_zoom}
                        imagePanX={p.image_pan_x}
                        imagePanY={p.image_pan_y}
                        size="thumb"
                        className="w-12 h-12 rounded-soft"
                      />
                    </td>
                    <td className="p-4">{p.name}</td>
                    <td className="p-4 text-sm">{adminCategories.find((c) => c.slug === p.category)?.label || p.category}</td>
                    <td className="p-4">{p.price.toLocaleString('ru-RU')} ₽</td>
                    <td className="p-4">{p.stock}</td>
                    <td className="p-4">
                      <button onClick={() => toggleProductActive(p)} className={`text-sm px-2 py-1 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-stone/20 text-stone/60'}`}>
                        {p.is_active ? 'Активен' : 'Скрыт'}
                      </button>
                    </td>
                    <td className="p-4 flex gap-2">
                      <button onClick={() => { setProductForm({ ...p }); setImageFile(null); setImagePreview(null); }} className="text-accent hover:underline text-sm">Изменить</button>
                      <button onClick={() => setDeleteProductId(p.id)} className="text-red-400 hover:underline text-sm">Удалить</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'categories' && !loading && (
        <div className="animate-fade-in max-w-2xl">
          <button onClick={() => setCategoryForm({ ...emptyCategory })} className="btn-primary !px-4 !py-2 mb-6">
            + Добавить категорию
          </button>

          {categoryForm && (
            <form onSubmit={saveCategory} className="card p-6 mb-6 space-y-4 animate-slide-up">
              <h3 className="font-semibold">{categoryForm.id ? 'Редактировать' : 'Новая категория'}</h3>
              {!categoryForm.id && (
                <div>
                  <label className="block text-sm font-medium mb-1">Код (латиница, например fruits)</label>
                  <input
                    required
                    value={categoryForm.slug}
                    onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value.toLowerCase() })}
                    className="input-field"
                    placeholder="fruits"
                    pattern="[a-z0-9_]+"
                  />
                </div>
              )}
              <input
                required
                placeholder="Название"
                value={categoryForm.label}
                onChange={(e) => setCategoryForm({ ...categoryForm, label: e.target.value })}
                className="input-field"
              />
              <ColorField
                label="Цвет на графике"
                value={categoryForm.chart_color}
                onChange={(v) => setCategoryForm({ ...categoryForm, chart_color: v })}
              />
              <input
                type="number"
                min={0}
                placeholder="Порядок сортировки"
                value={categoryForm.sort_order}
                onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: e.target.value })}
                className="input-field"
              />
              {categoryForm.id && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={categoryForm.is_active !== false} onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })} />
                  <span className="text-sm">Активна</span>
                </label>
              )}
              <div className="flex gap-3">
                <button type="submit" className="btn-primary !px-4 !py-2">Сохранить</button>
                <button type="button" onClick={() => setCategoryForm(null)} className="btn-secondary !px-4 !py-2">Отмена</button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {adminCategories.map((c) => (
              <div key={c.id} className={`admin-list-row ${!c.is_active ? 'opacity-50' : ''}`}>
                <div className="admin-list-row__content gap-3">
                  <span className="w-6 h-6 rounded-full border border-sand shrink-0" style={{ backgroundColor: c.chart_color }} />
                  <div>
                    <span className="font-medium">{c.label}</span>
                    <span className="text-stone/50 text-sm ml-2">({c.slug})</span>
                  </div>
                </div>
                <div className="admin-list-row__actions">
                  <button onClick={() => setCategoryForm({ ...c })} className="text-sm text-accent hover:underline">Изменить</button>
                  <button
                    onClick={() => api.deleteCategory(c.id).then(loadAdminCategories).catch((e) => toast.error(e.message))}
                    className="text-sm text-red-400 hover:underline"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'addresses' && !loading && (
        <div className="animate-fade-in max-w-2xl">
          <form onSubmit={handleAddAddress} className="card p-6 mb-6 flex gap-3">
            <input
              required
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Новый адрес доставки"
              className="input-field flex-1"
            />
            <button type="submit" className="btn-primary !px-4 !py-2">Добавить</button>
          </form>
          <div className="space-y-2">
            {addresses.map((a) => (
              <div key={a.id} className={`admin-list-row ${!a.is_active ? 'opacity-50' : ''}`}>
                <div className="admin-list-row__content">
                  <span>{a.address}</span>
                </div>
                <div className="admin-list-row__actions">
                  <button onClick={() => api.toggleAddress(a.id).then(loadAddresses).catch((e) => toast.error(e.message))} className="text-sm text-accent hover:underline">
                    {a.is_active ? 'Скрыть' : 'Показать'}
                  </button>
                  <button onClick={() => api.deleteAddress(a.id).then(loadAddresses).catch((e) => toast.error(e.message))} className="text-sm text-red-400 hover:underline">
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'dates' && !loading && (
        <div className="animate-fade-in max-w-2xl">
          <form onSubmit={handleAddDate} className="card p-6 mb-6 flex gap-3">
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="input-field flex-1"
            />
            <button type="submit" className="btn-primary !px-4 !py-2">Добавить</button>
          </form>
          <div className="space-y-2">
            {deliveryDates.map((d) => (
              <div key={d.id} className={`admin-list-row ${!d.is_active ? 'opacity-50' : ''}`}>
                <div className="admin-list-row__content">
                  <span>{formatDate(d.delivery_date)}</span>
                </div>
                <div className="admin-list-row__actions">
                  <button onClick={() => api.toggleDeliveryDate(d.id).then(loadDeliveryDates).catch((e) => toast.error(e.message))} className="text-sm text-accent hover:underline">
                    {d.is_active ? 'Скрыть' : 'Показать'}
                  </button>
                  <button onClick={() => api.deleteDeliveryDate(d.id).then(loadDeliveryDates).catch((e) => toast.error(e.message))} className="text-sm text-red-400 hover:underline">
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'orders' && !loading && (
        <div className="animate-fade-in">
          <div className="flex flex-wrap gap-3 mb-6">
            <select value={orderFilter.status} onChange={(e) => setOrderFilter({ ...orderFilter, status: e.target.value })} className="input-field max-w-xs">
              <option value="">Все статусы</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <input
              placeholder="Поиск по имени или телефону..."
              value={orderFilter.search}
              onChange={(e) => setOrderFilter({ ...orderFilter, search: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
              className="input-field max-w-xs"
            />
            <button onClick={() => loadOrders()} className="btn-secondary !px-4 !py-2">Найти</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full card">
              <thead>
                <tr className="border-b border-sand text-sm">
                  <th className="p-4 text-center">№</th>
                  <th className="p-4 text-center">Клиент</th>
                  <th className="p-4 text-center">Телефон</th>
                  <th className="p-4 text-center">Сумма</th>
                  <th className="p-4 text-center">Статус</th>
                  <th className="p-4 text-center">Дата</th>
                  <th className="p-4 text-center">Действия</th>
                </tr>
              </thead>
              <tbody>
                {orders.items.map((o) => (
                  <tr key={o.id} className="border-b border-sand/50 hover:bg-sand/20">
                    <td className="p-4 text-center">{o.id}</td>
                    <td className="p-4 text-center">{o.user_name || '—'}</td>
                    <td className="p-4 text-center whitespace-nowrap">{o.user_phone || '—'}</td>
                    <td className="p-4 text-center">{o.total.toLocaleString('ru-RU')} ₽</td>
                    <td className="p-4 text-center">
                      <select value={o.status} onChange={(e) => handleStatusChange(o.id, e.target.value)} className="input-field !py-1 !px-2 text-sm" disabled={o.status === 'cancelled'}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td className="p-4 text-sm text-center">{new Date(o.created_at).toLocaleString('ru-RU')}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => setSelectedOrder(o)} className="text-accent hover:underline text-sm">Детали</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setSelectedOrder(null)}>
              <div className="card p-6 max-w-lg w-full animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-semibold mb-4">Заказ №{selectedOrder.id}</h3>
                <p className="text-sm mb-2">👤 {selectedOrder.user_name || '—'} · {selectedOrder.user_phone || '—'}</p>
                <p className="text-sm mb-2">📍 {selectedOrder.address}</p>
                <p className="text-sm mb-4">📅 {formatDate(selectedOrder.delivery_date)}</p>
                <div className="space-y-1 mb-4">
                  {selectedOrder.items.map((i) => (
                    <div key={i.id} className="flex justify-between text-sm">
                      <span>{i.product_name} × {i.quantity}</span>
                      <span>{(i.price * i.quantity).toLocaleString('ru-RU')} ₽</span>
                    </div>
                  ))}
                </div>
                <p className="font-bold text-accent">Итого: {selectedOrder.total.toLocaleString('ru-RU')} ₽</p>
                <button onClick={() => setSelectedOrder(null)} className="btn-secondary mt-4 w-full !py-2">Закрыть</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'users' && !loading && (
        <div className="animate-fade-in">
          <div className="flex gap-3 mb-6">
            <input placeholder="Поиск по телефону или email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="input-field max-w-xs" />
            <button onClick={loadUsers} className="btn-secondary !px-4 !py-2">Найти</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full card">
              <thead>
                <tr className="border-b border-sand text-left text-sm">
                  <th className="p-4">Телефон</th>
                  <th className="p-4">Имя</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Админ</th>
                  <th className="p-4">Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-sand/50 hover:bg-sand/20">
                    <td className="p-4">{u.phone}</td>
                    <td className="p-4">{u.first_name} {u.last_name}</td>
                    <td className="p-4">{u.email || '—'}</td>
                    <td className="p-4">{u.is_admin ? '✅' : '—'}</td>
                    <td className="p-4">
                      <button onClick={() => handleToggleAdmin(u.id)} className="text-accent hover:underline text-sm">
                        {u.is_admin ? 'Снять админа' : 'Сделать админом'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'stock' && !loading && (
        <div className="animate-fade-in">
          <div className="space-y-3 mb-6">
            {stockItems.map((item, idx) => (
              <div key={item.product_id} className="card p-4 flex items-center gap-4">
                <span className="flex-1 font-medium">{item.name}</span>
                <input
                  type="number"
                  min={0}
                  value={item.stock}
                  onChange={(e) => {
                    const updated = [...stockItems];
                    updated[idx] = { ...item, stock: parseInt(e.target.value) || 0 };
                    setStockItems(updated);
                  }}
                  className="input-field !w-24 text-center"
                />
              </div>
            ))}
          </div>
          <button onClick={saveStock} className="btn-primary">Сохранить все изменения</button>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteProductId}
        title="Удалить товар?"
        message="Это действие нельзя отменить"
        confirmText="Удалить"
        danger
        onConfirm={handleDeleteProduct}
        onCancel={() => setDeleteProductId(null)}
      />
    </div>
  );
}
