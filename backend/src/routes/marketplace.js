// StarsCS Skin Marketplace — API Routes
// Mount this in server.js with: app.use('/api/v1/market', marketRouter)

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { fetchInventory, parseTradeUrl, isTradeUrlOwnedBySteamId, fetchMarketPrice, fetchFloatData } from '../services/inventory.js';
import { requestItemFromSeller, sendItemToBuyer, onOfferStateChanged, isBotReady } from '../services/steamBot.js';
import { requireAuth } from '../middleware/auth.js';
import { sensitiveActionLimiter } from '../middleware/rateLimit.js';
import { checkNotBanned } from '../middleware/ban.js';

const prisma = new PrismaClient();
const router = express.Router();

// Minimal narx UZS da (~6 500 so'm ≈ $0.50)
const MIN_PRICE_UZS = 6500;

// ---------------------------------------------------------
// 1. Foydalanuvchi trade link'ini saqlash
// ---------------------------------------------------------
router.post('/trade-url', requireAuth, checkNotBanned, async (req, res) => {
  const steamId = req.user.steamId; // endi req.body dan emas — tokendan olinadi, soxtalashtirib bo'lmaydi
  const { tradeUrl } = req.body;
  if (!tradeUrl) {
    return res.status(400).json({ success: false, message: 'tradeUrl talab qilinadi' });
  }
  const parsed = parseTradeUrl(tradeUrl);
  if (!parsed) {
    return res.status(400).json({ success: false, message: 'Trade link formati noto\'g\'ri' });
  }
  if (!isTradeUrlOwnedBySteamId(tradeUrl, steamId)) {
    return res.status(400).json({
      success: false,
      message: 'Bu trade link boshqa akkauntga tegishli. Hozir saytga kirgan akkauntingizning o\'z trade linkini kiriting.',
    });
  }

  let user;
  try {
    user = await prisma.user.update({
      where: { steamId },
      data: { tradeUrl },
    });
  } catch (err) {
    console.error('[market/trade-url] Prisma xatosi:', err.message);
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi (Steam orqali qaytadan kiring)' });
    }
    return res.status(500).json({ success: false, message: 'Server xatosi: ' + err.message });
  }

  res.json({ success: true, user });
});

// ---------------------------------------------------------
// 2. Foydalanuvchining Steam inventarini ko'rsatish (sotuvga qo'yish uchun)
// ---------------------------------------------------------
router.get('/inventory/:steamId', requireAuth, async (req, res) => {
  if (req.params.steamId !== req.user.steamId) {
    return res.status(403).json({ success: false, message: 'Faqat o\'z inventaringizni ko\'ra olasiz' });
  }
  try {
    const items = await fetchInventory(req.params.steamId);
    res.json({ success: true, items });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------
// 2b. Berilgan item uchun hozirgi Steam Market narxini tavsiya qilish (UZS da)
// ---------------------------------------------------------
router.get('/market-price', async (req, res) => {
  const { marketHashName } = req.query;
  if (!marketHashName) {
    return res.status(400).json({ success: false, message: 'marketHashName talab qilinadi' });
  }
  try {
    const price = await fetchMarketPrice(marketHashName);
    if (price === null) {
      return res.json({ success: true, price: null, message: 'Steam narx bermadi (yangi/kam savdo qilinadigan item bo\'lishi mumkin)' });
    }
    // price endi UZS da (Steam currency=507)
    res.json({ success: true, price, currency: 'UZS' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------
// 2c. Berilgan item uchun float qiymati va paint seed
// ---------------------------------------------------------
router.get('/float', async (req, res) => {
  const { inspectLink, assetId, marketHashName } = req.query;
  try {
    const data = await fetchFloatData(inspectLink, assetId, marketHashName);
    if (!data) {
      return res.json({ success: true, data: null, message: 'Float ma\'lumoti topilmadi' });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------
// 3. Sotuvga qo'yish (Listing yaratish)
// ---------------------------------------------------------
router.post('/listings', requireAuth, checkNotBanned, sensitiveActionLimiter, async (req, res) => {
  const sellerSteamId = req.user.steamId;
  // price — foydalanuvchi UZS da kiritadi (frontend Steam narxini UZS da ko'rsatadi)
  const { assetId, classId, instanceId, marketHashName, iconUrl, price, weaponType, inspectLink, floatValue, paintSeed } = req.body;

  if (!assetId || !price) {
    return res.status(400).json({ success: false, message: 'Majburiy maydonlar to\'ldirilmagan' });
  }
  if (Number(price) < MIN_PRICE_UZS) {
    return res.status(400).json({ success: false, message: `Minimal narx ${MIN_PRICE_UZS.toLocaleString()} UZS` });
  }

  const seller = await prisma.user.findUnique({ where: { steamId: sellerSteamId } });
  if (!seller) return res.status(404).json({ success: false, message: 'Sotuvchi topilmadi' });
  if (!seller.tradeUrl) {
    return res.status(400).json({ success: false, message: 'Avval trade link kiriting' });
  }

  // Duplicate tekshiruvi: shu assetId bilan ACTIVE yoki PENDING listing allaqachon bor bo'lsa, rad etamiz
  const existingListing = await prisma.skinListing.findFirst({
    where: {
      assetId,
      status: { in: ['ACTIVE', 'PENDING'] },
    },
  });
  if (existingListing) {
    return res.status(409).json({
      success: false,
      message: 'Bu skin allaqachon savdoda turibdi. Avval uni olib tashlang.',
    });
  }

  const parsedFloat = floatValue != null && floatValue !== '' ? parseFloat(floatValue) : null;
  const parsedSeed = paintSeed != null && paintSeed !== '' ? parseInt(paintSeed) : null;

  const listing = await prisma.skinListing.create({
    data: {
      sellerId: seller.id,
      assetId,
      classId,
      instanceId,
      marketHashName,
      weaponType,
      inspectLink,
      floatValue: parsedFloat && !isNaN(parsedFloat) ? parsedFloat : null,
      paintSeed: parsedSeed && !isNaN(parsedSeed) ? parsedSeed : null,
      iconUrl,
      price: Math.round(Number(price)), // UZS da saqlanadi
      status: 'ACTIVE',
    },
  });

  res.json({ success: true, listing });
});

// ---------------------------------------------------------
// 4. Barcha aktiv listinglarni ko'rsatish (do'kon sahifasi uchun)
// ---------------------------------------------------------
router.get('/listings', async (req, res) => {
  try {
    const listings = await prisma.skinListing.findMany({
      where: { status: 'ACTIVE' },
      include: { seller: { select: { id: true, displayName: true, avatarUrl: true, steamId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, listings });
  } catch (e) {
    res.json({ success: true, listings: [] });
  }
});

// ---------------------------------------------------------
// 4a. Sotuvdan olib tashlash (Listingni bekor qilish)
// ---------------------------------------------------------
router.delete('/listings/:id', requireAuth, checkNotBanned, async (req, res) => {
  try {
    const listingId = Number(req.params.id);
    const sellerSteamId = req.user.steamId;

    const seller = await prisma.user.findUnique({ where: { steamId: sellerSteamId } });
    if (!seller) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });

    const listing = await prisma.skinListing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ success: false, message: 'Item topilmadi' });

    if (listing.sellerId !== seller.id) {
      return res.status(403).json({ success: false, message: 'Faqat o\'zingizning itemingizni sotuvdan ola olasiz' });
    }

    if (listing.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Bu item hozir sotuvda emas yoki allaqachon sotilgan' });
    }

    await prisma.skinListing.delete({ where: { id: listingId } });
    res.json({ success: true, message: 'Skin sotuvdan olib tashlandi' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Sotuvdan olishda xatolik: ' + err.message });
  }
});

// ---------------------------------------------------------
// 4b. Tezkor sotish (Instant Sell)
// ---------------------------------------------------------
// Tezkor sotishda foydalanuvchiga bozor narxining 50% beriladi
const INSTANT_SELL_RATE = 0.5;

router.post('/instant-sell', requireAuth, checkNotBanned, sensitiveActionLimiter, async (req, res) => {
  const sellerSteamId = req.user.steamId;
  const { assetId, classId, instanceId, marketHashName, iconUrl } = req.body;

  if (!isBotReady()) {
    return res.status(503).json({ success: false, message: 'Bot hozir mavjud emas, birozdan keyin urinib ko\'ring' });
  }

  const seller = await prisma.user.findUnique({ where: { steamId: sellerSteamId } });
  if (!seller) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
  if (!seller.tradeUrl) {
    return res.status(400).json({ success: false, message: 'Avval trade link kiriting' });
  }

  // Duplicate tekshiruvi: shu assetId bilan ACTIVE yoki PENDING listing allaqachon bor bo'lsa, rad etamiz
  const existingListing = await prisma.skinListing.findFirst({
    where: { assetId, status: { in: ['ACTIVE', 'PENDING'] } },
  });
  if (existingListing) {
    return res.status(409).json({ success: false, message: 'Bu skin allaqachon savdo jarayonida turibdi' });
  }

  // marketPrice — Steam API dan UZS da keladi (currency=507)
  const marketPrice = await fetchMarketPrice(marketHashName);
  if (!marketPrice) {
    return res.status(400).json({ success: false, message: 'Bu item uchun bozor narxi topilmadi, tezkor sotish mumkin emas' });
  }

  // Tezkor sotish narxi UZS da: bozor narxining 50%, minimal MIN_PRICE_UZS
  const instantPrice = Math.max(MIN_PRICE_UZS, Math.round(marketPrice * INSTANT_SELL_RATE));

  const listing = await prisma.skinListing.create({
    data: {
      sellerId: seller.id,
      assetId, classId, instanceId, marketHashName, iconUrl,
      price: instantPrice, // UZS
      status: 'PENDING',
    },
  });

  const tx = await prisma.skinTransaction.create({
    data: {
      listingId: listing.id,
      buyerId: seller.id,
      sellerId: seller.id,
      price: instantPrice, // UZS
      status: 'AWAITING_SELLER_TRADE',
    },
  });

  try {
    const { offerId } = await requestItemFromSeller({ sellerTradeUrl: seller.tradeUrl, assetId });
    await prisma.skinTransaction.update({ where: { id: tx.id }, data: { botToSellerTradeOfferId: offerId } });

    res.json({
      success: true,
      message: `Bot'ga so'rov yuborildi. Tasdiqlagach, ${instantPrice.toLocaleString()} UZS balansingizga darhol tushadi.`,
      instantPrice,    // UZS
      marketPrice,     // UZS (Steam'dan kelgan)
      transactionId: tx.id,
    });
  } catch (err) {
    await prisma.skinListing.delete({ where: { id: listing.id } });
    await prisma.skinTransaction.update({ where: { id: tx.id }, data: { status: 'FAILED', failReason: err.message } });
    res.status(500).json({ success: false, message: 'Botga ulanishda xatolik: ' + err.message });
  }
});

// ---------------------------------------------------------
// 5. Sotib olish — escrow oqimini boshlaydi
// ---------------------------------------------------------
router.post('/listings/:id/buy', requireAuth, checkNotBanned, sensitiveActionLimiter, async (req, res) => {
  const listingId = Number(req.params.id);
  const buyerSteamId = req.user.steamId;

  if (!isBotReady()) {
    return res.status(503).json({ success: false, message: 'Bot hozir mavjud emas, birozdan keyin urinib ko\'ring' });
  }

  const buyer = await prisma.user.findUnique({ where: { steamId: buyerSteamId } });
  if (!buyer) return res.status(404).json({ success: false, message: 'Xaridor topilmadi' });
  if (!buyer.tradeUrl) {
    return res.status(400).json({ success: false, message: 'Avval profilingizda trade link kiriting' });
  }

  const listing = await prisma.skinListing.findUnique({
    where: { id: listingId },
    include: { seller: true },
  });
  if (!listing || listing.status !== 'ACTIVE') {
    return res.status(404).json({ success: false, message: 'Bu item endi sotuvda yo\'q' });
  }
  if (buyer.balance < listing.price) {
    return res.status(400).json({ success: false, message: 'Balansingiz yetarli emas' });
  }
  if (buyer.id === listing.sellerId) {
    return res.status(400).json({ success: false, message: 'O\'z itemingizni sotib ola olmaysiz' });
  }

  // MUHIM: atomic (shartli) update — faqat listing HALI HAM 'ACTIVE' bo'lsa PENDING'ga o'tkazamiz.
  // Agar count === 0 bo'lsa, boshqa so'rov (millisekundlar oldin) buni allaqachon egallagan —
  // ikki xaridor bir itemni bir vaqtda sotib olishining oldini shunday olamiz.
  const lockResult = await prisma.skinListing.updateMany({
    where: { id: listing.id, status: 'ACTIVE' },
    data: { status: 'PENDING' },
  });
  if (lockResult.count === 0) {
    return res.status(409).json({ success: false, message: 'Bu item hozirgina boshqa xaridor tomonidan sotib olindi' });
  }

  await prisma.user.update({
    where: { id: buyer.id },
    data: { balance: { decrement: listing.price } },
  });

  const tx = await prisma.skinTransaction.create({
    data: {
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: listing.sellerId,
      price: listing.price,
      status: 'AWAITING_SELLER_TRADE',
    },
  });

  try {
    const { offerId } = await requestItemFromSeller({
      sellerTradeUrl: listing.seller.tradeUrl,
      assetId: listing.assetId,
    });
    await prisma.skinTransaction.update({
      where: { id: tx.id },
      data: { botToSellerTradeOfferId: String(offerId) },
    });
    res.json({
      success: true,
      message: 'Sotuvchiga so\'rov yuborildi. U tasdiqlagach, item avtomatik sizga jo\'natiladi.',
      transactionId: tx.id,
    });
  } catch (err) {
    await prisma.user.update({ where: { id: buyer.id }, data: { balance: { increment: listing.price } } });
    await prisma.skinListing.update({ where: { id: listing.id }, data: { status: 'ACTIVE' } });
    await prisma.skinTransaction.update({
      where: { id: tx.id },
      data: { status: 'FAILED', failReason: err.message },
    });
    res.status(500).json({ success: false, message: 'Botga ulanishda xatolik: ' + err.message });
  }
});

// ---------------------------------------------------------
// 6. Bot trade holatini kuzatish — asosiy escrow avtomatikasi
// ---------------------------------------------------------
export function registerTradeStateWatcher() {
  onOfferStateChanged(async ({ offerId, newState, escrowEnds }) => {
    const ACCEPTED = 3;
    const IN_ESCROW = 11;

    if (newState === IN_ESCROW) {
      const sellerTxEscrow = await prisma.skinTransaction.findFirst({
        where: { botToSellerTradeOfferId: String(offerId), status: 'AWAITING_SELLER_TRADE' },
      });
      if (sellerTxEscrow) {
        if (sellerTxEscrow.buyerId === sellerTxEscrow.sellerId) {
          await prisma.$transaction([
            prisma.skinTransaction.update({
              where: { id: sellerTxEscrow.id },
              data: { status: 'COMPLETED', escrowEndsAt: escrowEnds },
            }),
            prisma.skinListing.update({ where: { id: sellerTxEscrow.listingId }, data: { status: 'BOT_STOCK' } }),
            prisma.user.update({ where: { id: sellerTxEscrow.sellerId }, data: { balance: { increment: sellerTxEscrow.price } } }),
          ]);
          return;
        }
        await prisma.skinTransaction.update({
          where: { id: sellerTxEscrow.id },
          data: { status: 'ESCROW_SELLER', escrowEndsAt: escrowEnds },
        });
        return;
      }
      const buyerTxEscrow = await prisma.skinTransaction.findFirst({
        where: { botToBuyerTradeOfferId: String(offerId), status: 'AWAITING_BUYER_TRADE' },
      });
      if (buyerTxEscrow) {
        await prisma.skinTransaction.update({
          where: { id: buyerTxEscrow.id },
          data: { status: 'ESCROW_BUYER', escrowEndsAt: escrowEnds },
        });
      }
      return;
    }

    if (newState !== ACCEPTED) return;

    const sellerTx = await prisma.skinTransaction.findFirst({
      where: {
        botToSellerTradeOfferId: String(offerId),
        status: { in: ['AWAITING_SELLER_TRADE', 'ESCROW_SELLER'] },
      },
      include: { listing: true, buyer: true, seller: true },
    });

    if (sellerTx) {
      if (sellerTx.buyerId === sellerTx.sellerId) {
        await prisma.$transaction([
          prisma.skinTransaction.update({ where: { id: sellerTx.id }, data: { status: 'COMPLETED' } }),
          prisma.skinListing.update({ where: { id: sellerTx.listingId }, data: { status: 'BOT_STOCK' } }),
          prisma.user.update({ where: { id: sellerTx.sellerId }, data: { balance: { increment: sellerTx.price } } }),
        ]);
        return;
      }

      await prisma.skinTransaction.update({
        where: { id: sellerTx.id },
        data: { status: 'BOT_HOLDING_ITEM' },
      });
      try {
        const { offerId: buyerOfferId } = await sendItemToBuyer({
          buyerTradeUrl: sellerTx.buyer.tradeUrl,
          assetId: sellerTx.listing.assetId,
        });
        await prisma.skinTransaction.update({
          where: { id: sellerTx.id },
          data: { status: 'AWAITING_BUYER_TRADE', botToBuyerTradeOfferId: String(buyerOfferId) },
        });
      } catch (err) {
        await prisma.$transaction([
          prisma.skinTransaction.update({
            where: { id: sellerTx.id },
            data: { status: 'NEEDS_ADMIN_REVIEW', failReason: 'Xaridorga jo\'natib bo\'lmadi: ' + err.message },
          }),
          prisma.user.update({ where: { id: sellerTx.buyerId }, data: { balance: { increment: sellerTx.price } } }),
        ]);
        console.error(`[market] Bitim #${sellerTx.id}: item bot inventarida qoldi, xaridorga pul qaytarildi.`);
      }
      return;
    }

    const buyerTx = await prisma.skinTransaction.findFirst({
      where: {
        botToBuyerTradeOfferId: String(offerId),
        status: { in: ['AWAITING_BUYER_TRADE', 'ESCROW_BUYER'] },
      },
      include: { listing: true },
    });

    if (buyerTx) {
      await prisma.$transaction([
        prisma.skinTransaction.update({ where: { id: buyerTx.id }, data: { status: 'COMPLETED' } }),
        prisma.skinListing.update({ where: { id: buyerTx.listingId }, data: { status: 'SOLD' } }),
        prisma.user.update({ where: { id: buyerTx.sellerId }, data: { balance: { increment: buyerTx.price } } }),
      ]);
    }
  });
}

// ---------------------------------------------------------
// 7. Bitim holatini tekshirish
// ---------------------------------------------------------
router.get('/transactions/:id', async (req, res) => {
  const tx = await prisma.skinTransaction.findUnique({
    where: { id: Number(req.params.id) },
    include: { listing: true },
  }).catch(() => null);

  if (!tx) return res.status(404).json({ success: false, message: 'Bitim topilmadi' });

  const STATUS_MESSAGES = {
    AWAITING_SELLER_TRADE: 'Sotuvchi tasdiqlashini kutmoqda',
    ESCROW_SELLER: 'Sotuvchi tasdiqladi, lekin Steam escrow\'ga qo\'ydi (akkauntida Mobile Authenticator 7 kundan kam faol)',
    BOT_HOLDING_ITEM: 'Item botda, xaridorga jo\'natilmoqda',
    AWAITING_BUYER_TRADE: 'Xaridor tasdiqlashini kutmoqda',
    ESCROW_BUYER: 'Xaridor tasdiqladi, lekin Steam escrow\'ga qo\'ydi (akkauntida Mobile Authenticator 7 kundan kam faol)',
    COMPLETED: 'Bitim yakunlandi',
    FAILED: 'Bitim muvaffaqiyatsiz tugadi',
    NEEDS_ADMIN_REVIEW: 'Xaridorga jo\'natib bo\'lmadi (pulingiz qaytarildi). Bu odatda xaridor akkauntining trade cheklovi tufayli sodir bo\'ladi.',
  };

  res.json({
    success: true,
    status: tx.status,
    message: STATUS_MESSAGES[tx.status] || tx.status,
    escrowEndsAt: tx.escrowEndsAt,
    failReason: tx.failReason,
  });
});

export default router;

// ---------------------------------------------------------
// Escrow tugagan bitimlarni avtomatik davom ettirish
// ---------------------------------------------------------
export function startEscrowReleaseChecker() {
  setInterval(async () => {
    const dueTransactions = await prisma.skinTransaction.findMany({
      where: { status: 'ESCROW_SELLER', escrowEndsAt: { lte: new Date() } },
      include: { listing: true, buyer: true },
    });

    for (const tx of dueTransactions) {
      try {
        const { offerId } = await sendItemToBuyer({ buyerTradeUrl: tx.buyer.tradeUrl, assetId: tx.listing.assetId });
        await prisma.skinTransaction.update({
          where: { id: tx.id },
          data: { status: 'AWAITING_BUYER_TRADE', botToBuyerTradeOfferId: String(offerId) },
        });
      } catch (err) {
        console.error(`[market] Escrow tugagan bitim #${tx.id}ni xaridorga jo'natishda xato:`, err.message);
        // Repeated spam olini olish: xatolik bo'lsa transaction statusini admin ko'rib chiqishi uchun belgilaymiz va xaridorga pulni qaytaramiz
        await prisma.$transaction([
          prisma.skinTransaction.update({
            where: { id: tx.id },
            data: { status: 'NEEDS_ADMIN_REVIEW', failReason: 'Escrow tugagach xaridorga jo\'natib bo\'lmadi: ' + err.message },
          }),
          prisma.user.update({
            where: { id: tx.buyerId },
            data: { balance: { increment: tx.price } },
          }),
        ]).catch((e) => console.error(`[market] Tx #${tx.id} refund xatosi:`, e.message));
      }
    }
  }, 15 * 60 * 1000);
}
