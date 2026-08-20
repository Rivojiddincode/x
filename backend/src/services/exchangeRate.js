/**
 * exchangeRate.js
 * USD → UZS real-time kurs servisi.
 *
 * Kursni open.er-api.com'dan olib, 10 daqiqa cache'da saqlaydi.
 * Agar API ishlamasa — oxirgi muvaffaqiyatli kursdan yoki
 * fallback konstantadan foydalaniladi.
 */

// Fallback kurs: API ishlamagan taqdirda ishlatiladi.
// Bu qiymatni vaqti-vaqti bilan yangilab turing.
const FALLBACK_RATE = 12900;

let cachedRate = null;
let cacheExpiresAt = 0;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 daqiqa

/**
 * Hozirgi 1 USD = ? UZS kursini qaytaradi.
 * Kurs 10 daqiqa davomida cache'da saqlanadi.
 * @returns {Promise<number>}
 */
export async function getUsdToUzsRate() {
  const now = Date.now();
  if (cachedRate && now < cacheExpiresAt) {
    return cachedRate;
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.UZS;
    if (!rate || typeof rate !== 'number') throw new Error('UZS kurs topilmadi');

    cachedRate = rate;
    cacheExpiresAt = now + CACHE_TTL_MS;
    console.log(`[exchangeRate] Kurs yangilandi: 1 USD = ${rate.toFixed(0)} UZS`);
    return rate;
  } catch (err) {
    console.error('[exchangeRate] Kurs olishda xato:', err.message, '— fallback ishlatiladi');
    // Eski cache'ni uzaytirish (bu safar xato bo'lsa ham 5 daqiqa cache'ni saqlaylik)
    if (cachedRate) {
      cacheExpiresAt = now + 5 * 60 * 1000;
      return cachedRate;
    }
    return FALLBACK_RATE;
  }
}

/**
 * USD miqdorini UZS ga aylantiradi.
 * @param {number} usd
 * @returns {Promise<number>} — butun son (UZS)
 */
export async function usdToUzs(usd) {
  const rate = await getUsdToUzsRate();
  return Math.round(usd * rate);
}
