// StarsCS — inPAY Payment Gateway Service
// Docs: https://inpay.uz/api/
// Bearer token 24 soat amal qiladi — har so'rovda emas, keshdan olinadi.

const INPAY_BASE = 'https://inpay.uz/api/v1';
const MERCHANT_ID = process.env.INPAY_MERCHANT_ID;
const MERCHANT_TOKEN = process.env.INPAY_MERCHANT_TOKEN;

// In-memory token cache (server restart bo'lsa yangilanadi)
let _cachedToken = null;
let _tokenExpiresAt = 0; // Unix ms

/**
 * inPAY Bearer tokenini oladi. 24 soat keshda saqlanadi.
 * Agar muddati o'tgan bo'lsa yoki token yo'q bo'lsa yangi token so'raladi.
 */
export async function getToken() {
  const now = Date.now();

  // 1 daqiqa oldin yangilash uchun margin
  if (_cachedToken && now < _tokenExpiresAt - 60_000) {
    return _cachedToken;
  }

  if (!MERCHANT_ID || !MERCHANT_TOKEN) {
    throw new Error("INPAY_MERCHANT_ID yoki INPAY_MERCHANT_TOKEN .env da yo'q");
  }

  const url = `${INPAY_BASE}/authorization/?merchant_id=${MERCHANT_ID}&merchant_token=${MERCHANT_TOKEN}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await res.json();

  if (!data.success || !data.bearer_token) {
    throw new Error(`inPAY token xatoligi: ${JSON.stringify(data)}`);
  }

  _cachedToken = data.bearer_token;
  _tokenExpiresAt = now + 24 * 60 * 60 * 1000; // 24 soat

  console.log('[inPAY] Bearer token yangilandi');
  return _cachedToken;
}

/**
 * Yangi to'lov invoice yaratadi.
 * @param {object} params
 * @param {string} params.steamId         — Foydalanuvchi Steam ID (description uchun)
 * @param {number} params.amount          — Summa UZS (min 1000)
 * @param {string} [params.clientIp]      — Foydalanuvchining haqiqiy IP manzili
 * @param {string} [params.paymentMethod] — 'click' | 'payme' | 'cardsystem' | undefined (tanlash sahifasi)
 * @returns {{ orderId: string, payUrl: string }}
 */
export async function createInvoice({ steamId, amount, clientIp, paymentMethod }) {
  const token = await getToken();
  const callbackUrl = process.env.INPAY_CALLBACK_URL;

  const body = {
    merchant_id: String(MERCHANT_ID),
    token: MERCHANT_TOKEN,
    amount: Number(amount),
    description: `StarsCS Balans To'ldirish — SteamID: ${steamId}`,
    ...(paymentMethod && { payment_method: paymentMethod }),
    ...(callbackUrl && { callback_url: callbackUrl }),
    ...(clientIp && { client_ip: clientIp }),
  };

  const res = await fetch(`${INPAY_BASE}/create/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!data.success) {
    const err = new Error(data.message || 'inPAY invoice yaratishda xatolik');
    err.code = data.error_code;
    throw err;
  }

  return { orderId: data.order_id, payUrl: data.pay_url };
}

/**
 * To'lov holatini tekshiradi (polling fallback).
 * @param {string} orderId
 * @returns {{ status: string, amount: number, paidAt: string|null }}
 */
export async function getPaymentStatus(orderId) {
  const res = await fetch(`${INPAY_BASE}/transactions/?order_id=${orderId}`, {
    headers: { Accept: 'application/json' },
  });
  const data = await res.json();

  if (!data.success) {
    const err = new Error(data.message || 'Tranzaksiya topilmadi');
    err.code = data.error_code;
    throw err;
  }

  return {
    status: data.status,             // 'pending' | 'success' | 'failed' | 'cancelled'
    amount: Number(data.amount),
    paymentMethod: data.payment_method,
    createdAt: data.created_at,
    paidAt: data.paid_at || null,
  };
}
