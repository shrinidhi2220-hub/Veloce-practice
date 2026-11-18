const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function getToken() {
  return window.localStorage.getItem('veloce-token') || '';
}

export function setSession(session) {
  if (session?.token) window.localStorage.setItem('veloce-token', session.token);
  if (session?.user) window.localStorage.setItem('veloce-user', JSON.stringify(session.user));
}

export function clearSession() {
  window.localStorage.removeItem('veloce-token');
  window.localStorage.removeItem('veloce-user');
}

export function getSavedUser() {
  try {
    return JSON.parse(window.localStorage.getItem('veloce-user') || 'null');
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let body;
  try {
    body = await response.json();
  } catch {
    body = { success: false, message: 'The server returned an unreadable response' };
  }
  if (!response.ok) {
    throw new Error(body.message || `Request failed (${response.status})`);
  }
  return body;
}

export const api = {
  health: () => request('/health'),
  products: (params = '') => request(`/api/products${params}`),
  product: (id) => request(`/api/products/${encodeURIComponent(id)}`),
  cartAdd: (sessionId, productId, quantity = 1) =>
    request('/api/cart', { method: 'POST', body: JSON.stringify({ sessionId, productId, quantity }) }),
  cartGet: (sessionId) => request(`/api/cart/${encodeURIComponent(sessionId)}`),
  cartUpdate: (sessionId, productId, quantity) =>
    request(`/api/cart/${encodeURIComponent(sessionId)}/items/${encodeURIComponent(productId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),
  cartRemove: (sessionId, productId) =>
    request(`/api/cart/${encodeURIComponent(sessionId)}/items/${encodeURIComponent(productId)}`, { method: 'DELETE' }),
  checkout: (body) => request('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/auth/me'),
  updateMe: (body) => request('/api/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),
  reviews: (productId) => request(`/api/reviews/${encodeURIComponent(productId)}`),
  createReview: (body) => request('/api/reviews', { method: 'POST', body: JSON.stringify(body) }),
  resale: () => request('/api/resale'),
  createResale: (body) => request('/api/resale', { method: 'POST', body: JSON.stringify(body) }),
  purchaseResale: (id, shippingAddress) =>
    request(`/api/resale/${encodeURIComponent(id)}/purchase`, {
      method: 'PATCH',
      body: JSON.stringify({ shippingAddress }),
    }),
  consents: () => request('/api/consent'),
  setConsent: (dataType, isConsent) =>
    request(`/api/consent/${encodeURIComponent(dataType)}`, { method: 'PUT', body: JSON.stringify({ isConsent }) }),
  rewards: () => request('/api/rewards/me'),
  playGame: () => request('/api/rewards/game/play', { method: 'POST', body: JSON.stringify({}) }),
  surprise: () => request('/api/surprise'),
  createSurprise: (body) => request('/api/surprise', { method: 'POST', body: JSON.stringify(body) }),
};
