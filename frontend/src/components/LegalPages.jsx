import React from 'react';
import { X } from 'lucide-react';

const SECTION_STYLE = { marginBottom: '18px' };
const H3_STYLE = { fontFamily: 'var(--font-heading)', fontSize: '15px', marginBottom: '6px', color: 'var(--span)' };
const P_STYLE = { fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 };

export function LegalModal({ type, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
      <div className="card" style={{ maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px' }}>
            {type === 'terms' ? "Foydalanuvchi shartlari" : 'Maxfiylik siyosati'}
          </h2>
          <X size={22} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
        </div>
        {type === 'terms' ? <TermsContent /> : <PrivacyContent />}
      </div>
    </div>
  );
}

function TermsContent() {
  return (
    <div>
      <div style={SECTION_STYLE}>
        <h3 style={H3_STYLE}>1. Umumiy qoidalar</h3>
        <p style={P_STYLE}>
          StarsCS — CS2 community server tarmog'i va unga tegishli xizmatlar (skin do'koni, VIP tariflar) taqdim etadi.
          Saytdan foydalanish orqali siz quyidagi shartlarga rozilik bildirasiz.
        </p>
      </div>
      <div style={SECTION_STYLE}>
        <h3 style={H3_STYLE}>2. Ichki balans</h3>
        <p style={P_STYLE}>
          Saytdagi balans — bu <b>ichki kredit</b> tizimi (moliyaviy vosita emas). Balans faqat quyidagilar uchun ishlatiladi:
          VIP tariflarni sotib olish va skin marketplace'da xarid qilish. Balansni real pulga aylantirib bo'lmaydi va
          naqd pul sifatida yechib olib bo'lmaydi.
        </p>
      </div>
      <div style={SECTION_STYLE}>
        <h3 style={H3_STYLE}>3. Skin Marketplace</h3>
        <p style={P_STYLE}>
          Skin sotish/sotib olish — foydalanuvchilar o'rtasidagi (P2P) bitim bo'lib, StarsCS bot vositachi (escrow)
          sifatida ishtirok etadi. Barcha narxlar sobit (fixed) — tasodifiy natijaga asoslangan xarid (case opening,
          gambling) saytda mavjud emas va bo'lmaydi. Minimal sotuv narxi — 6 500 UZS.
        </p>
      </div>
      <div style={SECTION_STYLE}>
        <h3 style={H3_STYLE}>4. Trade jarayoni va javobgarlik</h3>
        <p style={P_STYLE}>
          Trade jarayonida Steam'ning o'z qoidalari (escrow, Mobile Authenticator talablari) amal qiladi. StarsCS
          Steam'ning ushbu qoidalari tufayli yuzaga keladigan kechikishlar uchun javobgar emas, lekin bunday holatlarda
          foydalanuvchiga to'liq ma'lumot va zarur yordamni taqdim etadi.
        </p>
      </div>
      <div style={SECTION_STYLE}>
        <h3 style={H3_STYLE}>5. Taqiqlangan harakatlar</h3>
        <p style={P_STYLE}>
          Hisob ma'lumotlarini o'g'irlash, tizim zaifliklaridan foydalanish, boshqa foydalanuvchilarni firibgarlik
          qilishga urinish — bunday harakatlar aniqlansa, hisob bloklanadi va balans bekor qilinishi mumkin.
        </p>
      </div>
      <div style={SECTION_STYLE}>
        <h3 style={H3_STYLE}>6. O'zgarishlar</h3>
        <p style={P_STYLE}>
          StarsCS ushbu shartlarni istalgan vaqtda yangilashi mumkin. Muhim o'zgarishlar haqida saytda e'lon qilinadi.
        </p>
      </div>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div>
      <div style={SECTION_STYLE}>
        <h3 style={H3_STYLE}>1. Qanday ma'lumotlar yig'iladi</h3>
        <p style={P_STYLE}>
          Steam orqali kirganingizda quyidagi ochiq (public) ma'lumotlar olinadi: SteamID, profil nomi, avatar rasmi.
          Bundan tashqari, siz taqdim etgan trade link va marketplace faoliyatingiz (listing, xarid tarixi) saqlanadi.
        </p>
      </div>
      <div style={SECTION_STYLE}>
        <h3 style={H3_STYLE}>2. Ma'lumotlar qanday ishlatiladi</h3>
        <p style={P_STYLE}>
          Ma'lumotlar faqat sayt funksiyalarini ta'minlash uchun ishlatiladi: autentifikatsiya, balans/VIP holatini
          kuzatish, skin trade jarayonini amalga oshirish. Ma'lumotlar uchinchi tomonlarga sotilmaydi.
        </p>
      </div>
      <div style={SECTION_STYLE}>
        <h3 style={H3_STYLE}>3. Trade Link va Inventar</h3>
        <p style={P_STYLE}>
          Skin marketplace funksiyasidan foydalanish uchun Steam trade link kiritishingiz kerak. Bu havola faqat
          botning siz bilan trade qilishi uchun ishlatiladi, boshqa maqsadda foydalanilmaydi.
        </p>
      </div>
      <div style={SECTION_STYLE}>
        <h3 style={H3_STYLE}>4. Ma'lumotlar xavfsizligi</h3>
        <p style={P_STYLE}>
          Autentifikatsiya token (JWT) orqali amalga oshiriladi. Bot hisobining maxfiy kalitlari (shared_secret,
          identity_secret) faqat server tomonida, muhit o'zgaruvchilari (environment variables) sifatida saqlanadi.
        </p>
      </div>
      <div style={SECTION_STYLE}>
        <h3 style={H3_STYLE}>5. Ma'lumotni o'chirish</h3>
        <p style={P_STYLE}>
          Hisobingizni va unga tegishli ma'lumotlarni o'chirishni so'rash uchun "Murojaatlar" bo'limi orqali
          administratsiyaga murojaat qiling.
        </p>
      </div>
    </div>
  );
}
