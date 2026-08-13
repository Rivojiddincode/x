import axios from 'axios';

const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE = isLocalhost 
  ? 'http://localhost:5000/api/v1' 
  : (import.meta.env.VITE_API_URL || '/api/v1');

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

  async createPaymeCharge(data) {
    const res = await axios.post(`${API_BASE}/payments/payme/create`, data);
    return res.data;
  },

  async authenticateSteam() {
    const res = await axios.post(`${API_BASE}/auth/steam`);
    return res.data;
  }
};
