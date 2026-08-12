import { serversData } from './data/servers.js';
import { storeItems } from './data/store.js';
import { leaderboardData, punishmentsData, rewardsData, clansData } from './data/leaderboard.js';
import { translations } from './data/translations.js';

// Global Application State
const state = {
  lang: 'UZ',
  activeTab: 'servers',
  serverFilter: 'all',
  servers: [...serversData],
  store: [...storeItems],
  leaderboard: [...leaderboardData],
  punishments: [...punishmentsData],
  rewards: [...rewardsData],
  clans: [...clansData],
  totalOnline: 224
};

// DOM Elements Initialization
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initModals();
  initFilters();
  initSearch();
  initFormSubmissions();
  
  // Render Initial View
  renderServers();
  renderStore();
  renderLeaderboard();
  renderRewards();
  renderSkins();
  renderClans();
  renderBans();
  updateLanguageUI();
  
  // Start Live Ticker
  startLiveOnlineTicker();
});

// Tab Router & Navigation
function initNavigation() {
  const navBtns = document.querySelectorAll('[data-tab]');
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  document.getElementById('logo-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('servers');
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;

  // Update Nav Links UI
  document.querySelectorAll('[data-tab]').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update Tab Content Sections
  document.querySelectorAll('.tab-content').forEach(section => {
    if (section.id === `tab-${tabId}`) {
      section.classList.add('active');
    } else {
      section.classList.remove('active');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Render CS2 Server Cards
function renderServers() {
  const container = document.getElementById('servers-container');
  if (!container) return;

  const filtered = state.serverFilter === 'all' 
    ? state.servers 
    : state.servers.filter(s => s.mode.toUpperCase() === state.serverFilter.toUpperCase());

  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
      Ushbu rejim bo'yicha serverlar topilmadi.
    </div>`;
    return;
  }

  container.innerHTML = filtered.map(server => {
    const fillPercent = Math.min(100, Math.round((server.players / server.maxPlayers) * 100));
    return `
      <div class="server-card">
        <div class="server-card-header">
          <div class="server-card-overlay"></div>
          <span class="server-badge">${server.badge || server.mode}</span>
          <h3 class="server-name">${server.name}</h3>
        </div>
        <div class="server-card-body">
          <div class="server-meta">
            <div class="meta-item">
              <div class="meta-label">Rejim</div>
              <div class="meta-value">${server.mode}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Xarita</div>
              <div class="meta-value">${server.map}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Ping</div>
              <div class="meta-value" style="color: var(--green)">${server.ping}ms</div>
            </div>
          </div>

          <div class="online-bar-wrapper">
            <div class="online-bar-labels">
              <span>Onlayn:</span>
              <span><strong style="color: #fff">${server.players}</strong> / ${server.maxPlayers}</span>
            </div>
            <div class="online-bar-track">
              <div class="online-bar-fill" style="width: ${fillPercent}%"></div>
            </div>
          </div>

          <div class="server-actions">
            <button class="btn btn-connect" onclick="connectServer('${server.ip}')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              ${getI18n('connect')}
            </button>
            <button class="btn btn-copy" onclick="copyToClipboard('${server.ip}', 'Server IP nusxalandi!')">
              ${getI18n('copyIp')}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Render Store Products
function renderStore() {
  const container = document.getElementById('store-container');
  if (!container) return;

  container.innerHTML = state.store.map(item => `
    <div class="store-card ${item.popular ? 'popular' : ''}">
      ${item.popular ? `<span class="popular-tag">ENG OMMABOP</span>` : ''}
      <div>
        <h3 class="store-item-name" style="color: ${item.color}">${item.name}</h3>
        <div class="store-price">
          ${item.price.toLocaleString('uz-UZ')} <span class="store-period">${getI18n('priceMonth')}</span>
        </div>
        <ul class="feature-list">
          ${item.features.map(f => `
            <li class="feature-item">
              <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>${f}</span>
            </li>
          `).join('')}
        </ul>
      </div>
      <button class="btn btn-wallet btn-block" onclick="openPaymeModalFor('${item.name}', ${item.price})">
        ${getI18n('buyNow')}
      </button>
    </div>
  `).join('');
}

// Render Leaderboard
function renderLeaderboard(data = state.leaderboard) {
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;

  tbody.innerHTML = data.map(p => `
    <tr>
      <td><span class="rank-number rank-${p.rank}">${p.rank}</span></td>
      <td>
        <div class="player-cell">
          <img class="player-avatar" src="${p.avatar}" alt="${p.name}">
          <span>${p.name}</span>
        </div>
      </td>
      <td><strong style="color: var(--green)">${p.kills.toLocaleString()}</strong></td>
      <td><span style="color: var(--text-muted)">${p.deaths.toLocaleString()}</span></td>
      <td><strong style="color: var(--money)">${p.kd}</strong></td>
      <td>${p.headshots}</td>
      <td>${p.winRate}</td>
      <td><span class="rank-badge">${p.rankBadge}</span></td>
    </tr>
  `).join('');
}

// Render Daily Rewards
function renderRewards() {
  const container = document.getElementById('rewards-container');
  if (!container) return;

  container.innerHTML = state.rewards.map(r => `
    <div class="reward-card ${r.claimed ? 'claimed' : ''}">
      <div class="reward-day">${getI18n('day')} ${r.day}</div>
      <div class="reward-val">${r.amount}</div>
      <p style="font-size: 11px; color: var(--text-muted); text-align: center;">${r.title}</p>
      <button class="btn ${r.claimed ? 'btn-steam' : 'btn-wallet'}" style="font-size: 11px; padding: 6px 12px;" ${r.claimed ? 'disabled' : ''} onclick="claimReward(${r.day})">
        ${r.claimed ? getI18n('claimed') : getI18n('claim')}
      </button>
    </div>
  `).join('');
}

// Render CS2 Skins
function renderSkins() {
  const container = document.getElementById('skins-container');
  if (!container) return;

  const mockSkins = [
    { name: "Karambit | Doppler (Ruby)", img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4defER55K86_a4ch55648E44KA73d5W58944k6_Z10X-NfsQ-A19x315zR6uR9z2V1_5vX7kS5Z-9h5vF1_zM" },
    { name: "Butterfly Knife | Fade", img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4defER55K86_a4ch55648E44KA73d5W58944k6_Z10X-NfsQ-A19x315zR6uR9z2V1_5vX7kS5Z-9h5vF1_zM" },
    { name: "AK-47 | Fire Serpent", img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4defER55K86_a4ch55648E44KA73d5W58944k6_Z10X-NfsQ-A19x315zR6uR9z2V1_5vX7kS5Z-9h5vF1_zM" },
    { name: "AWP | Dragon Lore", img: "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZFCb4defER55K86_a4ch55648E44KA73d5W58944k6_Z10X-NfsQ-A19x315zR6uR9z2V1_5vX7kS5Z-9h5vF1_zM" }
  ];

  container.innerHTML = mockSkins.map(s => `
    <div class="skin-card">
      <div style="font-size: 38px; padding: 20px 0;">🗡️</div>
      <div class="skin-name">${s.name}</div>
      <button class="btn btn-primary" style="font-size: 12px;" onclick="equipSkin('${s.name}')">
        ${getI18n('selectSkin')}
      </button>
    </div>
  `).join('');
}

// Render Clans
function renderClans() {
  const tbody = document.getElementById('clans-tbody');
  if (!tbody) return;

  tbody.innerHTML = state.clans.map(c => `
    <tr>
      <td><strong style="color: var(--span)">#${c.rank}</strong></td>
      <td><strong>${c.name}</strong></td>
      <td><span class="rank-badge">${c.tag}</span></td>
      <td>${c.members} ta</td>
      <td><strong style="color: var(--money)">${c.rating} pts</strong></td>
      <td>${c.leader}</td>
    </tr>
  `).join('');
}

// Render Punishments
function renderBans() {
  const tbody = document.getElementById('bans-tbody');
  if (!tbody) return;

  tbody.innerHTML = state.punishments.map(b => `
    <tr>
      <td>#${b.id}</td>
      <td><strong>${b.name}</strong></td>
      <td><code style="color: var(--text-muted)">${b.steamId}</code></td>
      <td>${b.date}</td>
      <td>${b.admin}</td>
      <td><span style="color: var(--red)">${b.reason}</span></td>
      <td>${b.duration}</td>
      <td><span class="rank-badge" style="background: ${b.status === 'Active' ? 'rgba(255,73,64,0.2)' : 'rgba(255,255,255,0.05)'}; color: ${b.status === 'Active' ? 'var(--red)' : 'var(--text-muted)'}">${b.status}</span></td>
    </tr>
  `).join('');
}

// Filter Bar Handler
function initFilters() {
  const btns = document.querySelectorAll('#server-filter-bar .filter-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.serverFilter = btn.getAttribute('data-filter');
      renderServers();
    });
  });
}

// Search Handler
function initSearch() {
  const input = document.getElementById('leaderboard-search');
  input?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = state.leaderboard.filter(p => p.name.toLowerCase().includes(q) || p.rankBadge.toLowerCase().includes(q));
    renderLeaderboard(filtered);
  });
}

// Modals Handler
function initModals() {
  // Payme modal triggers
  document.getElementById('open-payme-modal')?.addEventListener('click', () => openModal('modal-payme'));
  document.getElementById('open-steam-modal')?.addEventListener('click', () => openModal('modal-steam'));
  document.getElementById('open-lang-modal')?.addEventListener('click', () => openModal('modal-lang'));

  // Close triggers
  document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    });
  });

  // Preset amount selectors
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.getAttribute('data-val');
      const amountInput = document.getElementById('payme-amount');
      if (amountInput) amountInput.value = val;
    });
  });

  // Language selectors
  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.lang-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      const lang = opt.getAttribute('data-lang');
      setLanguage(lang);
      document.getElementById('modal-lang')?.classList.remove('active');
    });
  });

  // Steam Auth Simulation
  document.getElementById('simulate-steam-login')?.addEventListener('click', () => {
    showToast('Steam account bilan muvaffaqiyatli kirildi! Xush kelibsiz, Chapanic', 'success');
    document.getElementById('modal-steam')?.classList.remove('active');
    const loginBtn = document.getElementById('open-steam-modal');
    if (loginBtn) loginBtn.innerHTML = `<span>Chapanic</span>`;
  });
}

function openModal(id) {
  document.getElementById(id)?.classList.add('active');
}

// Form Submissions
function initFormSubmissions() {
  document.getElementById('payme-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = document.getElementById('payme-amount').value;
    showToast(`Payme to'lov sahifasiga yo'naltirilmoqda... Summa: ${parseInt(amount).toLocaleString()} UZS`, 'success');
    document.getElementById('modal-payme')?.classList.remove('active');
  });

  document.getElementById('request-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Murojaatingiz muvaffaqiyatli yuborildi! Adminlar tez orada aloqaga chiqishadi.', 'success');
    document.getElementById('request-form').reset();
  });
}

// Language Engine
function setLanguage(langCode) {
  state.lang = langCode;
  document.getElementById('current-lang-code').innerText = langCode;
  updateLanguageUI();
}

function updateLanguageUI() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = getI18n(key);
    if (val) el.innerText = val;
  });
  
  // Re-render components with translated dynamic labels
  renderServers();
  renderStore();
  renderRewards();
  renderSkins();
}

function getI18n(key) {
  return translations[state.lang]?.[key] || translations['UZ']?.[key] || key;
}

// Live Online Counter Animation Ticker
function startLiveOnlineTicker() {
  setInterval(() => {
    const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
    state.totalOnline = Math.max(180, state.totalOnline + delta);
    
    const countEl = document.getElementById('total-online-count');
    const heroCountEl = document.getElementById('hero-total-online');
    if (countEl) countEl.innerText = state.totalOnline;
    if (heroCountEl) heroCountEl.innerText = state.totalOnline;

    // Randomize one server online count
    const randServer = state.servers[Math.floor(Math.random() * state.servers.length)];
    if (randServer) {
      randServer.players = Math.min(randServer.maxPlayers, Math.max(2, randServer.players + delta));
      renderServers();
    }
  }, 4000);
}

// Helper Actions attached to window
window.connectServer = (ip) => {
  showToast(`CS2 o'yiniga ulanish ishga tushirildi: steam://connect/${ip}`, 'success');
};

window.copyToClipboard = (text, msg) => {
  navigator.clipboard.writeText(text);
  showToast(msg, 'success');
};

window.openPaymeModalFor = (itemName, price) => {
  const amountInput = document.getElementById('payme-amount');
  if (amountInput) amountInput.value = price;
  openModal('modal-payme');
};

window.claimReward = (day) => {
  const item = state.rewards.find(r => r.day === day);
  if (item) {
    item.claimed = true;
    renderRewards();
    showToast(`${day}-kunlik mukofot (${item.amount}) balansingizga qo'shildi!`, 'success');
  }
};

window.equipSkin = (skinName) => {
  showToast(`'${skinName}' skini o'yiningiz uchun muvaffaqiyatli faollashtirildi!`, 'success');
};

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}
