// StarsCS Skin Marketplace — API Routes
// Mount this in server.js with: app.use('/api/v1/market', marketRouter)

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { fetchInventory, parseTradeUrl, isTradeUrlOwnedBySteamId, fetchMarketPrice } from '../services/inventory.js';
import { requestItemFromSeller, sendItemToBuyer, onOfferStateChanged, isBotReady } from '../services/steamBot.js';

const prisma = new PrismaClient();
const router = express.Router();

const MIN_PRICE = 0.5;

// ---------------------------------------------------------
// 1. Foydalanuvchi trade link'ini saqlash
// ---------------------------------------------------------
router.post('/trade-url', async (req, res) => {
  const { steamId, tradeUrl } = req.body;
  if (!steamId || !tradeUrl) {
    return res.status(400).json({ success: false, message: 'steamId va tradeUrl talab qilinadi' });
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
      // Prisma's "record not found" error — genuinely no such user
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi (Steam orqali qaytadan kiring)' });
    }
    // Any other error (missing column, DB connection issue, etc.) — surface the real reason
    return res.status(500).json({ success: false, message: 'Server xatosi: ' + err.message });
  }

  res.json({ success: true, user });
});

// ---------------------------------------------------------
// 1b. Steam Market'dagi hozirgi narxini olish (tavsiya uchun)
// ---------------------------------------------------------
router.get('/market-price', async (req, res) => {
  const { marketHashName } = req.query;
  if (!marketHashName) {
    return res.status(400).json({ success: false, message: 'marketHashName talab qilinadi' });
  }

  try {
    const price = await fetchMarketPrice(marketHashName);
    res.json({ success: true, price });
  } catch (err) {
    res.json({ success: false, price: null, message: err.message });
  }
});

// ---------------------------------------------------------
// 2. Foydalanuvchining Steam inventarini ko'rsatish (sotuvga qo'yish uchun)
// ---------------------------------------------------------
router.get('/inventory/:steamId', async (req, res) => {
  try {
    const items = await fetchInventory(req.params.steamId);
    res.json({ success: true, items });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------
// 3. Sotuvga qo'yish (Listing yaratish)
// ---------------------------------------------------------
router.post('/listings', async (req, res) => {
  const { sellerSteamId, assetId, classId, instanceId, marketHashName, iconUrl, price } = req.body;

  if (!sellerSteamId || !assetId || !price) {
    return res.status(400).json({ success: false, message: 'Majburiy maydonlar to\'ldirilmagan' });
  }
  if (Number(price) < MIN_PRICE) {
    return res.status(400).json({ success: false, message: `Minimal narx $${MIN_PRICE}` });
  }

  const seller = await prisma.user.findUnique({ where: { steamId: sellerSteamId } });
  if (!seller) return res.status(404).json({ success: false, message: 'Sotuvchi topilmadi' });
  if (!seller.tradeUrl) {
    return res.status(400).json({ success: false, message: 'Avval trade link kiriting' });
  }

  const listing = await prisma.skinListing.create({
    data: {
      sellerId: seller.id,
      assetId,
      classId,
      instanceId,
      marketHashName,
      iconUrl,
      price: Number(price),
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
      include: { seller: { select: { displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, listings });
  } catch (e) {
    res.json({ success: true, listings: [] });
  }
});

// ---------------------------------------------------------
// 5. Sotib olish — escrow oqimini boshlaydi
// ---------------------------------------------------------
router.post('/listings/:id/buy', async (req, res) => {
  const listingId = Number(req.params.id);
  const { buyerSteamId } = req.body;

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

  // Balansni "hold" qilamiz (darhol yechib qo'yamiz — bitim bekor bo'lsa qaytaramiz)
  await prisma.user.update({
    where: { id: buyer.id },
    data: { balance: { decrement: listing.price } },
  });
  await prisma.skinListing.update({ where: { id: listing.id }, data: { status: 'PENDING' } });

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
    // Bot so'rov yubora olmadi — balansni qaytaramiz, listing'ni tiklaymiz
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
  onOfferStateChanged(async ({ offerId, newState }) => {
    const ACCEPTED = 3;
    if (newState !== ACCEPTED) return;

    // Bu offer sotuvchidan bot tomon edimi?
    const sellerTx = await prisma.skinTransaction.findFirst({
      where: { botToSellerTradeOfferId: String(offerId), status: 'AWAITING_SELLER_TRADE' },
      include: { listing: true, buyer: true, seller: true },
    });

    if (sellerTx) {
      // Bot itemni sotuvchidan oldi -> endi xaridorga jo'natamiz
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
        await prisma.skinTransaction.update({
          where: { id: sellerTx.id },
          data: { status: 'FAILED', failReason: 'Xaridorga jo\'natishda xato: ' + err.message },
        });
      }
      return;
    }

    // Bu offer bot -> xaridor edimi?
    const buyerTx = await prisma.skinTransaction.findFirst({
      where: { botToBuyerTradeOfferId: String(offerId), status: 'AWAITING_BUYER_TRADE' },
      include: { listing: true },
    });

    if (buyerTx) {
      // Bitim yakunlandi — sotuvchi balansini to'ldiramiz, listing'ni SOLD qilamiz
      await prisma.$transaction([
        prisma.skinTransaction.update({ where: { id: buyerTx.id }, data: { status: 'COMPLETED' } }),
        prisma.skinListing.update({ where: { id: buyerTx.listingId }, data: { status: 'SOLD' } }),
        prisma.user.update({ where: { id: buyerTx.sellerId }, data: { balance: { increment: buyerTx.price } } }),
      ]);
    }
  });
}

export default router;
