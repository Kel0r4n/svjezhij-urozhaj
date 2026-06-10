const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function cleanMsg(msg) {
  if (!msg) return msg;
  return String(msg).replace(/^Value error,\s*/i, '');
}

async function request(path, options = {}) {
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && token) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.Authorization = `Bearer ${localStorage.getItem('access_token')}`;
      const retry = await fetch(`${API_BASE}${path}`, { ...options, headers });
      return handleResponse(retry);
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
    throw new ApiError('Сессия истекла', 401);
  }

  return handleResponse(res);
}

async function uploadRequest(path, file) {
  const token = localStorage.getItem('access_token');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  return handleResponse(res);
}

function extractErrorMessage(data) {
  if (!data?.detail) return 'Ошибка запроса';
  if (typeof data.detail === 'string') return cleanMsg(data.detail);
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((e) => cleanMsg(typeof e === 'string' ? e : e.msg || e.message || JSON.stringify(e)))
      .join('; ');
  }
  return 'Ошибка запроса';
}

async function handleResponse(res) {
  if (res.status === 204) return null;
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!res.ok) {
        throw new ApiError(text.slice(0, 200) || `Ошибка сервера (${res.status})`, res.status);
      }
      throw new ApiError('Некорректный ответ сервера', res.status);
    }
  }
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(data) || `Ошибка сервера (${res.status})`, res.status);
  }
  return data;
}

async function tryRefresh() {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/users/me'),
  updateMe: (data) => request('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),

  getProducts: (search, category, includeInactive = false) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (category) p.set('category', category);
    if (includeInactive) p.set('include_inactive', 'true');
    const q = p.toString();
    return request(`/products${q ? `?${q}` : ''}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  uploadProductImage: (id, file) => uploadRequest(`/products/${id}/image`, file),

  getCategories: () => request('/categories'),
  getAdminCategories: () => request('/admin/categories'),
  createCategory: (data) => request('/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/admin/categories/${id}`, { method: 'DELETE' }),

  getDeliveryAddresses: () => request('/delivery/addresses'),
  getDeliveryDates: () => request('/delivery/dates'),

  getCart: () => request('/cart'),
  addToCart: (data) => request('/cart', { method: 'POST', body: JSON.stringify(data) }),
  updateCartItem: (id, data) => request(`/cart/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeCartItem: (id) => request(`/cart/${id}`, { method: 'DELETE' }),
  syncCart: (items) => request('/cart/sync', { method: 'POST', body: JSON.stringify({ items }) }),
  clearCart: () => request('/cart', { method: 'DELETE' }),

  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  getOrders: (page = 1) => request(`/orders?page=${page}`),
  getOrder: (id) => request(`/orders/${id}`),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
  repeatOrder: (id) => request(`/orders/${id}/repeat`, { method: 'POST' }),

  getDashboard: () => request('/admin/dashboard'),
  getSalesAnalytics: ({ days = 30, categories = [] } = {}) => {
    const p = new URLSearchParams({ days });
    if (categories.length) p.set('categories', categories.join(','));
    return request(`/admin/analytics/sales?${p}`);
  },
  getDayDetail: (day, categories = []) => {
    const p = new URLSearchParams();
    if (categories.length) p.set('categories', categories.join(','));
    const q = p.toString();
    return request(`/admin/analytics/day/${day}${q ? `?${q}` : ''}`);
  },
  getAdminOrders: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/orders?${q}`);
  },
  getAdminOrder: (id) => request(`/admin/orders/${id}`),
  updateOrderStatus: (id, status) => request(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getUsers: (search) => request(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getAdminUser: (id) => request(`/admin/users/${id}`),
  createUserEvent: (userId, data) => request(`/admin/users/${userId}/events`, { method: 'POST', body: JSON.stringify(data) }),
  deleteUserEvent: (userId, eventId) => request(`/admin/users/${userId}/events/${eventId}`, { method: 'DELETE' }),

  getDeliveryManifest: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/deliveries/manifest?${q}`);
  },
  exportDeliveryManifest: async (day, address) => {
    const p = new URLSearchParams({ day });
    if (address) p.set('address', address);
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API_BASE}/admin/deliveries/export?${p}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(err.detail || 'Ошибка выгрузки', res.status);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deliveries_${day}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  getSchedule: () => request('/admin/schedule'),
  createScheduleSlot: (data) => request('/admin/schedule', { method: 'POST', body: JSON.stringify(data) }),
  deleteScheduleSlot: (id) => request(`/admin/schedule/${id}`, { method: 'DELETE' }),
  getExceptions: () => request('/admin/exceptions'),
  createException: (data) => request('/admin/exceptions', { method: 'POST', body: JSON.stringify(data) }),
  toggleException: (id) => request(`/admin/exceptions/${id}/toggle`, { method: 'PATCH' }),

  getDeliveryNext: (addressId) => request(`/delivery/next/${addressId}`),
  getDeliveryUpcoming: (addressId) => request(`/delivery/upcoming/${addressId}`),
  getDeliveryRoute: (day) => request(`/admin/deliveries/route?day=${day}`),
  importSchedule: (data) => request('/admin/schedule/import', { method: 'POST', body: JSON.stringify(data) }),
  toggleAdmin: (id) => request(`/admin/users/${id}/admin`, { method: 'PATCH' }),
  bulkUpdateStock: (items) => request('/admin/stock/bulk', { method: 'POST', body: JSON.stringify({ items }) }),

  getAdminAddresses: () => request('/admin/addresses'),
  createAddress: (address) => request('/admin/addresses', { method: 'POST', body: JSON.stringify({ address }) }),
  toggleAddress: (id) => request(`/admin/addresses/${id}/toggle`, { method: 'PATCH' }),
  deleteAddress: (id) => request(`/admin/addresses/${id}`, { method: 'DELETE' }),

  getAdminDeliveryDates: () => request('/admin/delivery-dates'),
  createDeliveryDate: (delivery_date) => request('/admin/delivery-dates', { method: 'POST', body: JSON.stringify({ delivery_date }) }),
  toggleDeliveryDate: (id) => request(`/admin/delivery-dates/${id}/toggle`, { method: 'PATCH' }),
  deleteDeliveryDate: (id) => request(`/admin/delivery-dates/${id}`, { method: 'DELETE' }),
};

export { ApiError };
