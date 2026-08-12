import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';

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
