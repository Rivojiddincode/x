import axios from 'axios';

const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE = isLocalhost 
  ? 'http://localhost:5000/api/v1' 
  : (import.meta.env.VITE_API_URL || '/api/v1');

/**
 * Autentifikatsiya talab qiladigan barcha so'rovlar shu orqali yuborilishi kerak —
 * `starscs_token`ni (Steam login'da olingan JWT) avtomatik Authorization header'ga qo'shadi.
 * Token bo'lmasa (kirilmagan), so'rov baribir yuboriladi — backend 401 qaytaradi,
 * chaqiruvchi tomon buni ushlab, foydalanuvchini qayta login qilishga yo'naltiradi.
 */
export async function authFetch(path, options = {}) {
  const token = localStorage.getItem('starscs_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  return res.json();
}

export const apiClient = {
  async getServers(mode = 'all') {
    const res = await axios.get(`${API_BASE}/servers?mode=${mode}`);
    return res.data;
  },

  async getStore() {
    const res = await axios.get(`${API_BASE}/store`);
    return res.data;
  },

  async getLeaderboard(search = '') {
    const res = await axios.get(`${API_BASE}/leaderboard?search=${search}`);
    return res.data;
  },

  async getBans() {
    const res = await axios.get(`${API_BASE}/bans`);
    return res.data;
  },

  async submitRequest(data) {
    const res = await axios.post(`${API_BASE}/requests`, data);
    return res.data;
  },

  async createInpayCharge(data) {
    // data: { amount, paymentMethod? }
    // Auth token authFetch orqali avtomatik qo'shiladi
    return authFetch('/payments/inpay/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPaymentStatus(orderId) {
    return authFetch(`/payments/inpay/status/${orderId}`);
  },

  async authenticateSteam() {
    const res = await axios.post(`${API_BASE}/auth/steam`);
    return res.data;
  },

  async buyVipTier(tierId) {
    return authFetch('/vip/purchase', {
      method: 'POST',
      body: JSON.stringify({ tierId }),
    });
  }
};
