import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import ConfirmModal from '../components/ConfirmModal';
import SalesChart from '../components/SalesChart';
import DayDetailChart from '../components/DayDetailChart';
import ColorField from '../components/ColorField';
import ProductCircleImage from '../components/ProductCircleImage';
import ProductImageEditor from '../components/ProductImageEditor';
import DateRangePicker from '../components/DateRangePicker';
import SegmentedControl from '../components/SegmentedControl';
import useDebounce from '../hooks/useDebounce';
import { getCurrentWeekRange, shiftWeek, formatRangeLabel, parseISODate, toISODate } from '../utils/dates';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'dashboard', label: 'Дашборд' },
  { id: 'products', label: 'Товары' },
  { id: 'categories', label: 'Категории' },
  { id: 'addresses', label: 'Адреса' },
  { id: 'schedule', label: 'График' },
  { id: 'dates', label: 'Даты доставки' },
  { id: 'orders', label: 'Заказы' },
  { id: 'users', label: 'Пользователи' },
  { id: 'stock', label: 'Склад' },
];

function shiftDay(iso, delta) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

const STATUS_OPTIONS = ['created', 'confirmed', 'in_transit', 'delivered', 'cancelled'];
const STATUS_LABELS = {
  created: 'Создан',
  confirmed: 'Подтверждён',
  in_transit: 'В пути',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};

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

  const [orders, setOrders] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [orderFilter, setOrderFilter] = useState(() => {
    const week = getCurrentWeekRange();
    return { status: '', search: '', address: '', delivery_from: week.from, delivery_to: week.to };
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarBtnRef = useRef(null);
  const manifestPrintRef = useRef(null);
  const [ordersViewMode, setOrdersViewMode] = useState('orders');
  const [manifest, setManifest] = useState({ rows: [], total_rows: 0 });
  const [deliveryRoute, setDeliveryRoute] = useState({ stops: [] });
  const debouncedOrderSearch = useDebounce(orderFilter.search, 300);

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', price: '' });

  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [slotForm, setSlotForm] = useState({ delivery_address_id: '', slot_date: '', delivery_time: '19:00' });
  const [importDate, setImportDate] = useState('');
  const [importText, setImportText] = useState('');
  const [excForm, setExcForm] = useState({
    exception_date: '', action: 'postponed', new_date: '', message: '', address_ids: [],
  });

  const [stockItems, setStockItems] = useState([]);

  const [adminCategories, setAdminCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState(null);

  const loadSalesAnalytics = useCallback(() => {
    api.getSalesAnalytics({ days: analyticsDays, categories: filterCategories })
      .then(setSalesData)
      .catch(() => setSalesData(null));
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
    const params = {
      page,
      delivery_from: orderFilter.delivery_from,
      delivery_to: orderFilter.delivery_to,
    };
    if (orderFilter.status) params.status = orderFilter.status;
    if (debouncedOrderSearch) params.search = debouncedOrderSearch;
    if (orderFilter.address) params.address = orderFilter.address;
    api.getAdminOrders(params)
      .then(setOrders)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  const loadManifest = () => {
    setLoading(true);
    const day = orderFilter.delivery_from;
    const params = { day };
    if (orderFilter.address) params.address = orderFilter.address;
    Promise.all([
      api.getDeliveryManifest(params),
      api.getDeliveryRoute(day).catch(() => ({ stops: [] })),
    ])
      .then(([m, r]) => {
        setManifest(m);
        setDeliveryRoute(r);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  const loadSchedule = () => {
    setLoading(true);
    Promise.all([api.getSchedule(), api.getExceptions(), api.getAdminAddresses()])
      .then(([slots, excs, addrs]) => {
        setScheduleSlots(slots);
        setExceptions(excs);
        setAddresses(addrs);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  const openUserDetail = (userId) => {
    setUserDetailLoading(true);
    setSelectedUser(null);
    api.getAdminUser(userId)
      .then(setSelectedUser)
      .catch((e) => toast.error(e.message))
      .finally(() => setUserDetailLoading(false));
  };

  const shiftOrderWeek = (delta) => {
    const next = shiftWeek(orderFilter.delivery_from, delta);
    setOrderFilter((f) => ({ ...f, delivery_from: next.from, delivery_to: next.to }));
  };

  const loadUsers = () => {
    setLoading(true);
    api.getUsers(debouncedUserSearch || undefined)
      .then(setUsers)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  const saveUserEvent = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await api.createUserEvent(selectedUser.id, {
        title: eventForm.title,
        description: eventForm.description,
        price: eventForm.price ? parseFloat(eventForm.price) : null,
      });
      setEventForm({ title: '', description: '', price: '' });
      openUserDetail(selectedUser.id);
      toast.success('Событие добавлено');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePrintManifest = () => {
    const el = manifestPrintRef.current;
    if (!el) return;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Доставки ${orderFilter.delivery_from}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px}table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #333;padding:6px 8px;text-align:left}th{background:#E6E0D4}</style></head><body>
      <h2>Доставки на ${formatDate(orderFilter.delivery_from)}</h2>${el.outerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const loadAdminCategories = () => {
    api.getAdminCategories()
      .then((data) => setAdminCategories(Array.isArray(data) ? data : []))
      .catch((e) => toast.error(e.message || 'Не удалось загрузить категории'));
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
    if (tab === 'categories') {
      setLoading(true);
      api.getAdminCategories().then(setAdminCategories).catch(() => {}).finally(() => setLoading(false));
    }
    if (tab === 'dashboard') loadAdminCategories();
    if (tab === 'addresses') loadAddresses();
    if (tab === 'dates') loadDeliveryDates();
    if (tab === 'schedule') loadSchedule();
    if (tab === 'orders') loadAddresses();
    if (tab === 'stock') loadStock();
  }, [tab]);

  useEffect(() => {
    if (tab === 'dashboard') loadSalesAnalytics();
  }, [tab, loadSalesAnalytics]);

  useEffect(() => {
    if (tab !== 'orders') return;
    if (ordersViewMode === 'orders') loadOrders();
    else loadManifest();
  }, [
    tab, ordersViewMode, orderFilter.delivery_from, orderFilter.delivery_to,
    orderFilter.address, orderFilter.status, debouncedOrderSearch,
  ]);

  useEffect(() => {
    if (tab === 'users') loadUsers();
  }, [tab, debouncedUserSearch]);

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
        <div className="animate-fade-in max-w-2xl mx-auto w-full">
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
              <div key={c.id} className={`card p-4 flex items-center justify-between gap-4 ${!c.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3 min-w-0 text-left">
                  <span className="w-6 h-6 rounded-full border border-sand shrink-0" style={{ backgroundColor: c.chart_color }} />
                  <div>
                    <span className="font-medium">{c.label}</span>
                    <span className="text-stone/50 text-sm ml-2">({c.slug})</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
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
        <div className="animate-fade-in max-w-2xl mx-auto w-full">
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
              <div key={a.id} className={`card p-4 flex items-center justify-between gap-4 ${!a.is_active ? 'opacity-50' : ''}`}>
                <span className="min-w-0 text-left">{a.address}</span>
                <div className="flex gap-2 shrink-0">
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
        <div className="animate-fade-in max-w-2xl mx-auto w-full">
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
              <div key={d.id} className={`card p-4 flex items-center justify-between gap-4 ${!d.is_active ? 'opacity-50' : ''}`}>
                <span className="min-w-0 text-left">{formatDate(d.delivery_date)}</span>
                <div className="flex gap-2 shrink-0">
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
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (ordersViewMode === 'deliveries') {
                  const d = shiftDay(orderFilter.delivery_from, -1);
                  setOrderFilter((f) => ({ ...f, delivery_from: d, delivery_to: d }));
                } else shiftOrderWeek(-1);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-sand/70 text-stone transition hover:bg-warm"
              title={ordersViewMode === 'deliveries' ? 'Предыдущий день' : 'Предыдущая неделя'}
            >
              ‹
            </button>
            <span className="min-w-[10rem] text-center text-sm font-medium text-stone">
              {ordersViewMode === 'deliveries'
                ? formatDate(orderFilter.delivery_from)
                : formatRangeLabel(orderFilter.delivery_from, orderFilter.delivery_to)}
            </span>
            <button
              type="button"
              onClick={() => {
                if (ordersViewMode === 'deliveries') {
                  const d = shiftDay(orderFilter.delivery_from, 1);
                  setOrderFilter((f) => ({ ...f, delivery_from: d, delivery_to: d }));
                } else shiftOrderWeek(1);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-sand/70 text-stone transition hover:bg-warm"
              title={ordersViewMode === 'deliveries' ? 'Следующий день' : 'Следующая неделя'}
            >
              ›
            </button>
            <button
              ref={calendarBtnRef}
              type="button"
              onClick={() => setCalendarOpen((v) => !v)}
              className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                calendarOpen
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-sand bg-[#FDF8F3] text-stone hover:border-accent/50 hover:bg-accent/10'
              }`}
              title={ordersViewMode === 'deliveries' ? 'Выбрать день' : 'Выбрать период'}
              aria-label="Календарь"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </button>
            <DateRangePicker
              open={calendarOpen}
              onClose={() => setCalendarOpen(false)}
              anchorRef={calendarBtnRef}
              singleDay={ordersViewMode === 'deliveries'}
              value={{ from: orderFilter.delivery_from, to: orderFilter.delivery_to }}
              onChange={({ from, to }) => {
                setOrderFilter((f) => ({
                  ...f,
                  delivery_from: from,
                  delivery_to: ordersViewMode === 'deliveries' ? from : to,
                }));
              }}
            />
            <span className="text-xs text-stone/70">
              {ordersViewMode === 'deliveries'
                ? `${manifest.total_rows} позиций`
                : `${orders.total} заказ(ов) за период`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select
              value={orderFilter.address}
              onChange={(e) => setOrderFilter({ ...orderFilter, address: e.target.value })}
              className="input-field max-w-md min-w-[200px]"
            >
              <option value="">Все адреса доставки</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.address}>{a.address}</option>
              ))}
            </select>
            {ordersViewMode === 'orders' && (
              <>
                <select value={orderFilter.status} onChange={(e) => setOrderFilter({ ...orderFilter, status: e.target.value })} className="input-field max-w-xs">
                  <option value="">Все статусы</option>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
                <input
                  placeholder="Поиск по имени или телефону..."
                  value={orderFilter.search}
                  onChange={(e) => setOrderFilter({ ...orderFilter, search: e.target.value })}
                  className="input-field max-w-xs"
                />
              </>
            )}
            <SegmentedControl
              options={[
                { value: 'orders', label: 'Заказы' },
                { value: 'deliveries', label: 'Доставки' },
              ]}
              value={ordersViewMode}
              onChange={(mode) => {
                if (mode === 'deliveries') {
                  const day = orderFilter.delivery_from;
                  setOrderFilter((f) => ({ ...f, delivery_from: day, delivery_to: day }));
                }
                setOrdersViewMode(mode);
              }}
            />
            {ordersViewMode === 'deliveries' && (
              <>
                <button
                  type="button"
                  onClick={() => api.exportDeliveryManifest(orderFilter.delivery_from, orderFilter.address || undefined).catch((e) => toast.error(e.message))}
                  className="btn-secondary !px-4 !py-2 text-sm"
                >
                  Excel
                </button>
                <button type="button" onClick={handlePrintManifest} className="btn-secondary !px-4 !py-2 text-sm">
                  PDF / Печать
                </button>
              </>
            )}
          </div>

          {ordersViewMode === 'orders' ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full card">
                  <thead>
                    <tr className="border-b border-sand text-sm">
                      <th className="p-4 text-center">№</th>
                      <th className="p-4 text-center">Клиент</th>
                      <th className="p-4 text-center">Телефон</th>
                      <th className="p-4 text-center">Адрес</th>
                      <th className="p-4 text-center">Доставка</th>
                      <th className="p-4 text-center">Сумма</th>
                      <th className="p-4 text-center">Статус</th>
                      <th className="p-4 text-center">Создан</th>
                      <th className="p-4 text-center">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.items.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-stone/70">
                          Нет заказов за выбранный период
                        </td>
                      </tr>
                    )}
                    {orders.items.map((o) => (
                      <tr key={o.id} className="border-b border-sand/50 hover:bg-sand/20">
                        <td className="p-4 text-center">{o.id}</td>
                        <td className="p-4 text-center">{o.user_name || '—'}</td>
                        <td className="p-4 text-center whitespace-nowrap">{o.user_phone || '—'}</td>
                        <td className="p-4 text-center text-sm max-w-[180px] truncate" title={o.address}>{o.address}</td>
                        <td className="p-4 text-sm text-center whitespace-nowrap">{formatDate(o.delivery_date)}</td>
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

              {orders.pages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button type="button" disabled={orders.page <= 1} onClick={() => loadOrders(orders.page - 1)} className="btn-secondary !px-4 !py-2 disabled:opacity-40">← Назад</button>
                  <span className="text-sm text-stone">{orders.page} / {orders.pages}</span>
                  <button type="button" disabled={orders.page >= orders.pages} onClick={() => loadOrders(orders.page + 1)} className="btn-secondary !px-4 !py-2 disabled:opacity-40">Вперёд →</button>
                </div>
              )}
            </>
          ) : (
            <>
            {deliveryRoute.stops?.length > 0 && (
              <div className="card p-4 mb-4">
                <h3 className="font-medium mb-3">Маршрут на {formatDate(orderFilter.delivery_from)}</h3>
                <div className="space-y-2">
                  {deliveryRoute.stops.map((stop, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-3 text-sm border-b border-sand/40 pb-2 last:border-0">
                      <span className="font-mono font-medium w-14">{stop.time}</span>
                      <span className="flex-1">{stop.address}</span>
                      <span className="text-stone/70">{stop.orders_count} зак. · {stop.items_count} поз.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="overflow-x-auto" ref={manifestPrintRef}>
              <table className="w-full card text-sm">
                <thead>
                  <tr className="border-b border-sand">
                    <th className="p-3 text-left">Контакт</th>
                    <th className="p-3 text-left">Телефон</th>
                    <th className="p-3 text-left">Товар</th>
                    <th className="p-3 text-center">Цена</th>
                    <th className="p-3 text-center">Количество</th>
                    <th className="p-3 text-left">ЖК</th>
                  </tr>
                </thead>
                <tbody>
                  {manifest.rows.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-stone/70">Нет доставок на этот день</td></tr>
                  )}
                  {manifest.rows.map((row, i) => (
                    <tr key={i} className="border-b border-sand/50">
                      <td className="p-3">{row.contact}</td>
                      <td className="p-3 whitespace-nowrap">{row.phone || '—'}</td>
                      <td className="p-3">{row.product}</td>
                      <td className="p-3 text-center">{row.price.toLocaleString('ru-RU')}</td>
                      <td className="p-3 text-center">{row.quantity}</td>
                      <td className="p-3">{row.address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}

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

      {tab === 'schedule' && !loading && (
        <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
          <section>
            <h3 className="font-semibold mb-3">Импорт маршрута из текста</h3>
            <p className="text-sm text-stone/70 mb-4">
              Вставьте блок из чата (формат «19:00 — Микрогород»), укажите дату маршрута — адреса сопоставятся автоматически.
            </p>
            <form
              className="card p-4 space-y-3 mb-6"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await api.importSchedule({ route_date: importDate, text: importText });
                  loadSchedule();
                  toast.success(`Добавлено: ${res.count}. Не найдено: ${res.skipped.length ? res.skipped.join(', ') : '—'}`);
                  if (!res.skipped.length) setImportText('');
                } catch (err) {
                  toast.error(err.message);
                }
              }}
            >
              <input type="date" required value={importDate} onChange={(e) => setImportDate(e.target.value)} className="input-field w-48" />
              <textarea
                required
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={'19:00 — Среда\n19:20 — 21/19\n21:00 — Май'}
                className="input-field min-h-[120px] font-mono text-sm"
              />
              <button type="submit" className="btn-primary !px-4 !py-2">Импортировать</button>
            </form>
          </section>

          <section>
            <h3 className="font-semibold mb-3">График по адресам</h3>
            <p className="text-sm text-stone/70 mb-4">
              Укажите конкретную дату и время для каждого ЖК.
            </p>
            <form
              className="card p-4 flex flex-wrap gap-3 mb-4"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api.createScheduleSlot({
                    delivery_address_id: Number(slotForm.delivery_address_id),
                    slot_date: slotForm.slot_date,
                    delivery_time: slotForm.delivery_time,
                  });
                  setSlotForm({ ...slotForm, delivery_time: '19:00' });
                  loadSchedule();
                  toast.success('Слот добавлен');
                } catch (err) {
                  toast.error(err.message);
                }
              }}
            >
              <select required value={slotForm.delivery_address_id} onChange={(e) => setSlotForm({ ...slotForm, delivery_address_id: e.target.value })} className="input-field flex-1 min-w-[180px]">
                <option value="">Адрес</option>
                {addresses.map((a) => <option key={a.id} value={a.id}>{a.address}</option>)}
              </select>
              <input type="date" required value={slotForm.slot_date} onChange={(e) => setSlotForm({ ...slotForm, slot_date: e.target.value })} className="input-field w-44" />
              <input type="time" required value={slotForm.delivery_time} onChange={(e) => setSlotForm({ ...slotForm, delivery_time: e.target.value })} className="input-field w-32" />
              <button type="submit" className="btn-primary !px-4 !py-2">Добавить</button>
            </form>
            <div className="space-y-2">
              {scheduleSlots.map((s) => {
                const addr = addresses.find((a) => a.id === s.delivery_address_id);
                return (
                  <div key={s.id} className="card p-3 flex items-center justify-between gap-3">
                    <span>{addr?.address || '—'} · {formatDate(s.slot_date)} · {s.delivery_time}</span>
                    <button type="button" onClick={() => api.deleteScheduleSlot(s.id).then(loadSchedule).catch((e) => toast.error(e.message))} className="text-sm text-red-400 hover:underline">Удалить</button>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="font-semibold mb-3">Исключения (перенос / отмена)</h3>
            <p className="text-sm text-stone/70 mb-4">
              Например: «Доставка в ЖК Среда переносится на следующую неделю» — выберите дату, адреса и новую дату.
            </p>
            <form
              className="card p-4 space-y-3 mb-4"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api.createException({
                    exception_date: excForm.exception_date,
                    action: excForm.action,
                    new_date: excForm.action === 'postponed' ? excForm.new_date : null,
                    message: excForm.message,
                    address_ids: excForm.address_ids,
                  });
                  setExcForm({ exception_date: '', action: 'postponed', new_date: '', message: '', address_ids: [] });
                  loadSchedule();
                  toast.success('Исключение создано');
                } catch (err) {
                  toast.error(err.message);
                }
              }}
            >
              <div className="flex flex-wrap gap-3">
                <input type="date" required value={excForm.exception_date} onChange={(e) => setExcForm({ ...excForm, exception_date: e.target.value })} className="input-field w-44" />
                <select value={excForm.action} onChange={(e) => setExcForm({ ...excForm, action: e.target.value })} className="input-field w-40">
                  <option value="postponed">Перенос</option>
                  <option value="cancelled">Отмена</option>
                </select>
                {excForm.action === 'postponed' && (
                  <input type="date" required value={excForm.new_date} onChange={(e) => setExcForm({ ...excForm, new_date: e.target.value })} className="input-field w-44" placeholder="Новая дата" />
                )}
              </div>
              <textarea value={excForm.message} onChange={(e) => setExcForm({ ...excForm, message: e.target.value })} placeholder="Сообщение для клиентов..." className="input-field min-h-[72px]" />
              <div className="flex flex-wrap gap-2">
                {addresses.map((a) => (
                  <label key={a.id} className="flex items-center gap-1 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={excForm.address_ids.includes(a.id)}
                      onChange={(e) => {
                        setExcForm((f) => ({
                          ...f,
                          address_ids: e.target.checked
                            ? [...f.address_ids, a.id]
                            : f.address_ids.filter((x) => x !== a.id),
                        }));
                      }}
                    />
                    {a.address}
                  </label>
                ))}
              </div>
              <button type="submit" className="btn-primary !px-4 !py-2" disabled={!excForm.address_ids.length}>Сохранить исключение</button>
            </form>
            <div className="space-y-2">
              {exceptions.map((ex) => (
                <div key={ex.id} className={`card p-4 ${!ex.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-medium">{formatDate(ex.exception_date)} → {ex.action === 'postponed' && ex.new_date ? formatDate(ex.new_date) : 'отмена'}</p>
                      {ex.message && <p className="text-sm text-stone mt-1">{ex.message}</p>}
                      <p className="text-xs text-stone/60 mt-1">Адресов: {ex.address_ids.length}</p>
                    </div>
                    <button type="button" onClick={() => api.toggleException(ex.id).then(loadSchedule).catch((e) => toast.error(e.message))} className="text-sm text-accent hover:underline shrink-0">
                      {ex.is_active ? 'Отключить' : 'Включить'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'users' && !loading && (
        <div className="animate-fade-in">
          <div className="flex gap-3 mb-6">
            <input placeholder="Поиск по имени, телефону или email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="input-field max-w-sm" />
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
                    <td className="p-4 space-x-3">
                      <button onClick={() => openUserDetail(u.id)} className="text-accent hover:underline text-sm">
                        Детали
                      </button>
                      <button onClick={() => handleToggleAdmin(u.id)} className="text-accent hover:underline text-sm">
                        {u.is_admin ? 'Снять админа' : 'Сделать админом'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(selectedUser || userDetailLoading) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => !userDetailLoading && setSelectedUser(null)}>
              <div className="card p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
                {userDetailLoading ? (
                  <div className="py-12 flex justify-center"><Spinner /></div>
                ) : selectedUser && (
                  <>
                    <h3 className="font-semibold text-lg mb-1">
                      {selectedUser.last_name} {selectedUser.first_name} {selectedUser.patronymic || ''}
                    </h3>
                    <p className="text-sm text-stone mb-1">📞 {selectedUser.phone}</p>
                    {selectedUser.email && <p className="text-sm text-stone mb-1">✉️ {selectedUser.email}</p>}
                    <p className="text-sm text-stone/70 mb-4">
                      Регистрация: {new Date(selectedUser.created_at).toLocaleDateString('ru-RU')}
                      {selectedUser.is_admin && ' · Администратор'}
                    </p>
                    <div className="flex gap-4 mb-4 text-sm">
                      <span className="rounded-full bg-sand/50 px-3 py-1">Заказов: {selectedUser.orders_count}</span>
                      <span className="rounded-full bg-accent/20 px-3 py-1">
                        На сумму: {selectedUser.orders_total.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>

                    <form onSubmit={saveUserEvent} className="rounded-soft border border-sand/60 bg-white p-4 mb-6 space-y-3">
                      <h4 className="font-medium">Добавить событие / комментарий</h4>
                      <input required value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Название (например: Заказ)" className="input-field" />
                      <textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Описание" className="input-field min-h-[64px]" />
                      <input type="number" min="0" step="0.01" value={eventForm.price} onChange={(e) => setEventForm({ ...eventForm, price: e.target.value })} placeholder="Цена (необязательно)" className="input-field max-w-xs" />
                      <button type="submit" className="btn-primary !py-2 !px-4 text-sm">Добавить</button>
                    </form>

                    <h4 className="font-medium mb-3">История</h4>
                    {(() => {
                      const timeline = [
                        ...selectedUser.orders.map((o) => ({
                          key: `order-${o.id}`,
                          type: 'order',
                          date: o.created_at,
                          data: o,
                        })),
                        ...(selectedUser.events || []).map((ev) => ({
                          key: `event-${ev.id}`,
                          type: 'event',
                          date: ev.created_at,
                          data: ev,
                        })),
                      ].sort((a, b) => new Date(b.date) - new Date(a.date));

                      if (!timeline.length) return <p className="text-sm text-stone/70">Записей пока нет</p>;

                      return (
                        <div className="space-y-3">
                          {timeline.map((item) => item.type === 'order' ? (
                            <div key={item.key} className="rounded-soft border border-sand/60 bg-cream/50 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                <span className="font-medium">Заказ №{item.data.id}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                item.data.status === 'delivered' ? 'bg-accent/30' :
                                item.data.status === 'in_transit' ? 'bg-purple-100 text-purple-700' :
                                item.data.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                'bg-sand/70'
                                }`}>
                                  {STATUS_LABELS[item.data.status] || item.data.status}
                                </span>
                              </div>
                              <p className="text-sm text-stone mb-1">📍 {item.data.address}</p>
                              <p className="text-sm text-stone mb-2">
                                📅 Доставка: {formatDate(item.data.delivery_date)} · {new Date(item.data.created_at).toLocaleString('ru-RU')}
                              </p>
                              <div className="space-y-1 border-t border-sand/40 pt-2">
                                {item.data.items.map((i) => (
                                  <div key={i.id} className="flex justify-between text-sm">
                                    <span>{i.product_name} × {i.quantity}</span>
                                    <span>{(i.price * i.quantity).toLocaleString('ru-RU')} ₽</span>
                                  </div>
                                ))}
                              </div>
                              <p className="text-right font-semibold text-accent mt-2">{item.data.total.toLocaleString('ru-RU')} ₽</p>
                            </div>
                          ) : (
                            <div key={item.key} className="rounded-soft border border-accent/30 bg-accent/5 p-4">
                              <div className="flex justify-between gap-2 mb-1">
                                <span className="font-medium">{item.data.title}</span>
                                <button
                                  type="button"
                                  onClick={() => api.deleteUserEvent(selectedUser.id, item.data.id).then(() => openUserDetail(selectedUser.id)).catch((e) => toast.error(e.message))}
                                  className="text-xs text-red-400 hover:underline"
                                >
                                  Удалить
                                </button>
                              </div>
                              {item.data.description && <p className="text-sm text-stone mb-1">{item.data.description}</p>}
                              <p className="text-xs text-stone/60">
                                {new Date(item.data.created_at).toLocaleString('ru-RU')}
                                {item.data.price != null && ` · ${item.data.price.toLocaleString('ru-RU')} ₽`}
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    <button onClick={() => setSelectedUser(null)} className="btn-secondary mt-6 w-full !py-2">Закрыть</button>
                  </>
                )}
              </div>
            </div>
          )}
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
