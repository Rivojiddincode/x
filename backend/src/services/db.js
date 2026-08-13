// StarsCS In-Memory Database Store with REST API capabilities
export const db = {
  servers: [
    { id: "5x5", name: "StarsCS | 5x5 COMPETITIVE #1 [TICK 128]", mode: "5x5", ip: "185.178.47.10:27015", map: "de_dust2", onlinePlayers: 87, maxPlayers: 100, ping: 5, badge: "HOT" },
    { id: "retake", name: "StarsCS | RETAKE RETRY #1 [FAST RESPAWN]", mode: "RETAKE", ip: "185.178.47.11:27015", map: "de_mirage", onlinePlayers: 18, maxPlayers: 20, ping: 7, badge: "POPULAR" },
    { id: "duels", name: "StarsCS | 1v1 DUELS ARENA [RANKED]", mode: "DUELS", ip: "185.178.47.12:27015", map: "am_aim_texture", onlinePlayers: 24, maxPlayers: 32, ping: 4, badge: "RANKED" },
    { id: "dm", name: "StarsCS | FFA DEATHMATCH [ONLY HS / MULTI-CFG]", mode: "DM", ip: "185.178.47.13:27015", map: "de_inferno", onlinePlayers: 22, maxPlayers: 24, ping: 6, badge: "AIM" },
    { id: "awp", name: "StarsCS | AWP LEGO 2 [FAST RELOAD + VIP SKINS]", mode: "AWP", ip: "185.178.47.14:27015", map: "awp_lego_2", onlinePlayers: 26, maxPlayers: 30, ping: 5, badge: "SNIPER" },
    { id: "minigame", name: "StarsCS | MINIGAMES & MANIAC FUN", mode: "MINIGAME", ip: "185.178.47.15:27015", map: "mg_course_v3", onlinePlayers: 32, maxPlayers: 40, ping: 8, badge: "FUN" },
    { id: "bhop", name: "StarsCS | BHOP & KZ MOVEMENT [GLOBAL TIMER]", mode: "BHOP & KZ", ip: "185.178.47.16:27015", map: "bhop_badges", onlinePlayers: 12, maxPlayers: 20, ping: 6, badge: "SKILL" },
    { id: "surf", name: "StarsCS | SURF UTOPIA [STAGED & TIMER]", mode: "SURF", ip: "185.178.47.17:27015", map: "surf_utopia_v3", onlinePlayers: 15, maxPlayers: 24, ping: 7, badge: "SURF" },
    { id: "modellar", name: "StarsCS | CUSTOM MODELS & SKINS 5v5", mode: "MODELLAR", ip: "185.178.47.18:27015", map: "de_anubis", onlinePlayers: 17, maxPlayers: 20, ping: 5, badge: "CUSTOM" }
  ],
  storeItems: [
    { id: "vip-silver", name: "VIP Silver", price: 35000, period: "oyiga", popular: false, color: "#a0aec0", features: ["Barcha serverlarga kirish ustunligi (Reserved Slot)", "Maxsus VIP Chat tegi `[VIP Silver]`", "O'yin boshida +105 HP va qo'shimcha zirh", "Skinchanger uchun bazaviy ruxsat", "Qo'shimcha granatalar toplami"] },
    { id: "vip-gold", name: "VIP Gold", price: 65000, period: "oyiga", popular: true, color: "#ffa300", features: ["Silver darajasidagi barcha imkoniyatlar", "Har bir roundda +$1000 qo'shimcha pul", "Qodir bo'lgan unikal agent modellarini tanlash", "Custom FOV o'rnatish imkoniyati", "Avtomatik bomb defuse kit (CT uchun)", "Doimiy VIP Discord / Telegram roli"] },
    { id: "vip-diamond", name: "VIP Diamond", price: 110000, period: "oyiga", popular: false, color: "#5a80f2", features: ["Barcha Gold va Silver afzalliklari", "Eksklyuziv Diamond statusi va rangi", "Har o'ldirishda (Kill) +10 HP tiklanish", "Premium Knives & Gloves Skinchanger kirishi", "Server to'lib ketganda ham zudlik bilan ulanish", "Saytda maxsus Diamond Profil belgisi"] },
    { id: "custom-fov", name: "Custom FOV Unlock", price: 25000, period: "oyiga", popular: false, color: "#64ce82", features: ["O'yin maydonini (FOV) 120 gradusgacha kengaytirish", "Qurol ko'rinish joylashuvini sozlash", "Ekran silkinishini kamaytirish"] },
    { id: "reserved-slot", name: "Reserved Slot Access", price: 20000, period: "oyiga", popular: false, color: "#ff4940", features: ["Server 100% to'lganida ham kirmasdan qolib ketmaysiz", "Oddiy o'yinchilardan ustun kirish navbati"] },
    { id: "skin-pass", name: "Premium Skin Pass", price: 45000, period: "oyiga", popular: false, color: "#e2e8f0", features: ["CS2 ning eng so'nggi va qimmatbaho pichoqlari (Karambit, Butterfly)", "StatTrak™ hisoblagichi bilan barcha qurollar", "Qo'lqoplar va Stikerlar to'plami"] }
  ],
  leaderboard: [
    { rank: 1, name: "Chapanic", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Chapanic", kills: 14230, deaths: 4890, kd: "2.91", headshots: "68%", winRate: "74%", rankBadge: "GLOBAL ELITE" },
    { rank: 2, name: "KODY", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=KODY", kills: 12890, deaths: 5100, kd: "2.52", headshots: "64%", winRate: "71%", rankBadge: "SUPREME" },
    { rank: 3, name: "s1mple_uz", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=s1mple_uz", kills: 11450, deaths: 4980, kd: "2.30", headshots: "68%", winRate: "68%", rankBadge: "SUPREME" },
    { rank: 4, name: "Tashkent_King", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Tashkent", kills: 9840, deaths: 4600, kd: "2.14", headshots: "59%", winRate: "65%", rankBadge: "LEM" },
    { rank: 5, name: "ShadowCS", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=ShadowCS", kills: 9120, deaths: 4430, kd: "2.05", headshots: "62%", winRate: "62%", rankBadge: "LEM" },
    { rank: 6, name: "Samarkand_Sniper", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Samarkand", kills: 8760, deaths: 4390, kd: "1.99", headshots: "55%", winRate: "60%", rankBadge: "GLOBAL ELITE" }
  ],
  bans: [
    { id: 1, name: "hacker_99", steamId: "STEAM_1:0:8492041", date: "2026-08-12 16:40", admin: "Chapanic", reason: "AIMBOT / WallHack", duration: "Muddatsiz (Ban)", status: "Active" },
    { id: 2, name: "ToxicBoy", steamId: "STEAM_1:1:9401923", date: "2026-08-12 14:15", admin: "KODY", reason: "Chatda Haqorat va Toksiklik", duration: "7 Kun (Mute)", status: "Active" },
    { id: 3, name: "NoobMaster", steamId: "STEAM_1:0:1930291", date: "2026-08-11 20:05", admin: "System Auto-AntiCheat", reason: "Spinbot Detector", duration: "Muddatsiz (Ban)", status: "Active" }
  ],
  requests: [],
  payments: [],
  users: {}
};
