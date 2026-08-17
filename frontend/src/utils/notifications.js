// StarsCS — Brauzer bildirishnomalari
// Foydalanuvchi ruxsat bergan bo'lsa, sahifa fon rejimida (boshqa tab'da) bo'lsa ham
// trade holati o'zgarganda xabar beradi. Ruxsat berilmagan bo'lsa — jim ishlaydi,
// oddiy toast xabarlar (chatdagidek) baribir ko'rsatiladi.

export function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function notifyBackground(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  // Faqat tab fonda bo'lganda ko'rsatamiz — foreground'da toast yetarli, ikkalasi birga ortiqcha
  if (document.visibilityState === 'visible') return;

  try {
    new Notification(title, { body, icon: '/favicon.ico' });
  } catch (e) {
    // ayrim brauzerlar/muhitlar Notification'ni bloklashi mumkin — jim o'tkazamiz
  }
}
