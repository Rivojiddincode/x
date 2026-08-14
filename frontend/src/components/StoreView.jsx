import React from 'react';
import { Check, ShoppingCart, Star, Medal, Crown, Gem, Eye, Lock, Sparkles } from 'lucide-react';

const FALLBACK_STORE_ITEMS = [
  { id: "vip-silver", name: "VIP Silver", price: 35000, period: "oyiga", popular: false, color: "#a0aec0", features: ["Barcha serverlarga kirish ustunligi (Reserved Slot)", "Maxsus VIP Chat tegi `[VIP Silver]`", "O'yin boshida +105 HP va qo'shimcha zirh", "Skinchanger uchun bazaviy ruxsat"] },
  { id: "vip-gold", name: "VIP Gold", price: 65000, period: "oyiga", popular: true, color: "#ffa300", features: ["Silver darajasidagi barcha imkoniyatlar", "Har bir roundda +$1000 qo'shimcha pul", "Qodir bo'lgan unikal agent modellarini tanlash", "Custom FOV o'rnatish imkoniyati", "Avtomatik defuse kit"] },
  { id: "vip-diamond", name: "VIP Diamond", price: 110000, period: "oyiga", popular: false, color: "#5a80f2", features: ["Barcha Gold va Silver afzalliklari", "Eksklyuziv Diamond statusi va rangi", "Har o'ldirishda +10 HP tiklanish", "Premium Knives & Gloves Skinchanger kirishi"] },
  { id: "custom-fov", name: "Custom FOV Unlock", price: 25000, period: "oyiga", popular: false, color: "#64ce82", features: ["O'yin maydonini (FOV) 120 gradusgacha kengaytirish", "Qurol ko'rinish joylashuvini sozlash"] },
  { id: "reserved-slot", name: "Reserved Slot Access", price: 20000, period: "oyiga", popular: false, color: "#ff4940", features: ["Server 100% to'lganida ham ustun ulanish navbati"] },
  { id: "skin-pass", name: "Premium Skin Pass", price: 45000, period: "oyiga", popular: false, color: "#e2e8f0", features: ["CS2 ning eng so'nggi va qimmatbaho pichoqlari (Karambit, Butterfly)", "StatTrak™ hisoblagichi bilan barcha qurollar"] }
];

const TIER_ICONS = {
  "vip-silver": Medal,
  "vip-gold": Crown,
  "vip-diamond": Gem,
  "custom-fov": Eye,
  "reserved-slot": Lock,
  "skin-pass": Sparkles,
};

export function StoreView({ storeItems = [], onBuy }) {
  const itemsToDisplay = (storeItems && storeItems.length > 0) ? storeItems : FALLBACK_STORE_ITEMS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Star color="var(--money)" size={24} fill="var(--money)" /> CS2 VIP & Imtiyozlar Do'koni
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
          Serverlarimizda VIP maqom va ustunliklarga ega bo'lish uchun tarif tanlang
        </p>
      </div>

      <div className="grid">
        {itemsToDisplay.map(item => {
          const featuresList = Array.isArray(item.features)
            ? item.features
            : typeof item.features === 'string'
              ? item.features.split(',').map(s => s.trim())
              : [];

          const Icon = TIER_ICONS[item.id] || Star;
          const accent = item.color || 'var(--span)';

          return (
            <div
              key={item.id}
              className="vip-card"
              style={{
                '--accent': accent,
                borderColor: item.popular ? accent : 'var(--card-border)',
                boxShadow: item.popular ? `0 0 0 1px ${accent}55, 0 20px 44px -18px ${accent}66` : undefined,
              }}
            >
              {/* Top accent bar */}
              <div className="vip-card-bar" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />

              {item.popular && (
                <div className="vip-badge" style={{ background: accent }}>
                  <Star size={11} fill="#fff" /> ENG MASHHUR
                </div>
              )}

              <div className="vip-icon-badge" style={{ background: `${accent}1f`, color: accent, boxShadow: `0 0 24px ${accent}33` }}>
                <Icon size={22} />
              </div>

              <h3 className="vip-name" style={{ color: item.popular ? accent : '#fff' }}>{item.name}</h3>

              <div className="vip-price">
                {Number(item.price).toLocaleString()} <span className="vip-price-currency">UZS</span>
                <span className="vip-price-period"> / {item.period || 'oyiga'}</span>
              </div>

              <ul className="vip-feature-list">
                {featuresList.map((f, i) => (
                  <li key={i}>
                    <Check size={14} color={accent} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                className="vip-buy-btn"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 8px 20px -6px ${accent}88` }}
                onClick={() => onBuy(item.price)}
              >
                <ShoppingCart size={16} /> Xarid qilish
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
