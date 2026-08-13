import React from 'react';
import { Check, ShoppingCart, Star } from 'lucide-react';

const FALLBACK_STORE_ITEMS = [
  { id: "vip-silver", name: "VIP Silver", price: 35000, period: "oyiga", popular: false, color: "#a0aec0", features: ["Barcha serverlarga kirish ustunligi (Reserved Slot)", "Maxsus VIP Chat tegi `[VIP Silver]`", "O'yin boshida +105 HP va qo'shimcha zirh", "Skinchanger uchun bazaviy ruxsat"] },
  { id: "vip-gold", name: "VIP Gold", price: 65000, period: "oyiga", popular: true, color: "#ffa300", features: ["Silver darajasidagi barcha imkoniyatlar", "Har bir roundda +$1000 qo'shimcha pul", "Qodir bo'lgan unikal agent modellarini tanlash", "Custom FOV o'rnatish imkoniyati", "Avtomatik defuse kit"] },
  { id: "vip-diamond", name: "VIP Diamond", price: 110000, period: "oyiga", popular: false, color: "#5a80f2", features: ["Barcha Gold va Silver afzalliklari", "Eksklyuziv Diamond statusi va rangi", "Har o'ldirishda +10 HP tiklanish", "Premium Knives & Gloves Skinchanger kirishi"] },
  { id: "custom-fov", name: "Custom FOV Unlock", price: 25000, period: "oyiga", popular: false, color: "#64ce82", features: ["O'yin maydonini (FOV) 120 gradusgacha kengaytirish", "Qurol ko'rinish joylashuvini sozlash"] },
  { id: "reserved-slot", name: "Reserved Slot Access", price: 20000, period: "oyiga", popular: false, color: "#ff4940", features: ["Server 100% to'lganida ham ustun ulanish navbati"] },
  { id: "skin-pass", name: "Premium Skin Pass", price: 45000, period: "oyiga", popular: false, color: "#e2e8f0", features: ["CS2 ning eng so'nggi va qimmatbaho pichoqlari (Karambit, Butterfly)", "StatTrak™ hisoblagichi bilan barcha qurollar"] }
];

export function StoreView({ storeItems = [], onBuy }) {
  const itemsToDisplay = (storeItems && storeItems.length > 0) ? storeItems : FALLBACK_STORE_ITEMS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Star color="var(--primary)" size={24} /> CS2 VIP & Imtiyozlar Do'koni
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
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

          return (
            <div key={item.id} className="card" style={{ borderColor: item.popular ? 'var(--primary)' : 'var(--card-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {item.popular && (
                  <div style={{ background: 'var(--primary)', color: '#fff', fontSize: '10px', fontWeight: '900', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px' }}>
                    ENG MASHHUR
                  </div>
                )}
                <h3 className="card-title" style={{ color: item.color || '#fff' }}>{item.name}</h3>
                <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--money)', margin: '12px 0' }}>
                  {Number(item.price).toLocaleString()} UZS <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ {item.period || 'oyiga'}</span>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', padding: 0 }}>
                  {featuresList.map((f, i) => (
                    <li key={i} style={{ fontSize: '13px', color: '#ccc', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <Check size={14} color="var(--green)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button className="btn btn-wallet" style={{ marginTop: '20px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => onBuy(item.price)}>
                <ShoppingCart size={16} /> Xarid qilish
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
