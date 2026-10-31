/**
 * KartSkinManager: Manages player coin wallet, skin purchases, unlocking,
 * and active vehicle skin data.
 */

export const KART_SKINS = [
  {
    id: 'classic_red',
    name: 'Red Comet (लाल शोला)',
    tagline: 'F1 Racing Classic',
    price: 0,
    unlocked: true,
    primaryColor: 0xe01b24,
    secondaryColor: 0xf4f6fa,
    accentColor: 0xf0be3c,
    rimColor: 0xf0be3c,
    underglowColor: 0xff1744,
    sparkColor: [1.0, 0.45, 0.08],
    glowClass: 'skin-glow-red',
    description: 'क्लासिक फॉर्मूला 1 रेड रेसर स्पीड मशीन।',
  },
  {
    id: 'cyber_neon',
    name: 'Cyber Neon (साइबर नियॉन)',
    tagline: 'Neo Tokyo Synthwave',
    price: 150,
    unlocked: false,
    primaryColor: 0x00f0ff,
    secondaryColor: 0xff007f,
    accentColor: 0x00ffff,
    rimColor: 0x00f0ff,
    underglowColor: 0x00e5ff,
    sparkColor: [0.0, 0.92, 1.0],
    glowClass: 'skin-glow-cyan',
    description: 'इलेक्ट्रिक सियान और मैजेंटा साइबरपंक नियॉन बॉडी।',
  },
  {
    id: 'gold_emperor',
    name: 'Gold Emperor (गोल्डन किंग)',
    tagline: '24K Liquid Gold Luxury',
    price: 300,
    unlocked: false,
    primaryColor: 0xffd700,
    secondaryColor: 0xffffff,
    accentColor: 0x222222,
    rimColor: 0xffe600,
    underglowColor: 0xffbb00,
    sparkColor: [1.0, 0.85, 0.2],
    glowClass: 'skin-glow-gold',
    description: '24K शुद्ध सोने की चमक और रॉयल क्रोम रिम्स।',
  },
  {
    id: 'toxic_venom',
    name: 'Toxic Venom (जहरीला वेनम)',
    tagline: 'Acid Radioactive Beast',
    price: 450,
    unlocked: false,
    primaryColor: 0x39ff14,
    secondaryColor: 0x111111,
    accentColor: 0x76ff03,
    rimColor: 0x39ff14,
    underglowColor: 0x39ff14,
    sparkColor: [0.22, 1.0, 0.1],
    glowClass: 'skin-glow-green',
    description: 'रेडियोएक्टिव एसिड ग्रीन और कार्बन ब्लैक फिनिश।',
  },
  {
    id: 'midnight_shadow',
    name: 'Midnight Shadow (डार्क शैडो)',
    tagline: 'Stealth Phantom Ghost',
    price: 600,
    unlocked: false,
    primaryColor: 0x15161c,
    secondaryColor: 0xff0033,
    accentColor: 0x8b0000,
    rimColor: 0xff1744,
    underglowColor: 0xff0044,
    sparkColor: [1.0, 0.05, 0.2],
    glowClass: 'skin-glow-dark',
    description: 'मैट ब्लैक और ब्लड रेड स्ट्राइप्स, अल्टीमेट स्टील्थ लुक।',
  },
  {
    id: 'lava_inferno',
    name: 'Lava Inferno (ज्वालामुखी)',
    tagline: 'Volcanic Magma Fire',
    price: 800,
    unlocked: false,
    primaryColor: 0xff3d00,
    secondaryColor: 0xffeb3b,
    accentColor: 0xd50000,
    rimColor: 0xff9100,
    underglowColor: 0xff4500,
    sparkColor: [1.0, 0.25, 0.0],
    glowClass: 'skin-glow-orange',
    description: 'दहकते हुए लावे के अंगारे और जलती हुई आग की धारियां।',
  },
  {
    id: 'ice_blizzard',
    name: 'Ice Blizzard (बर्फ़ीला तूफ़ान)',
    tagline: 'Sub-Zero Frost Crystal',
    price: 1000,
    unlocked: false,
    primaryColor: 0x80d8ff,
    secondaryColor: 0xffffff,
    accentColor: 0x0091ea,
    rimColor: 0xe0f7fa,
    underglowColor: 0x40c4ff,
    sparkColor: [0.5, 0.85, 1.0],
    glowClass: 'skin-glow-ice',
    description: 'बर्फ़ीला तूफ़ान क्रिस्टल ब्लू और फ्रॉस्ट सिल्वर रिम्स।',
  },
  {
    id: 'lightning_beast',
    name: 'Lightning Beast (तूफ़ानी बिजली)',
    tagline: 'Supercharged Thunderbolt',
    price: 1500,
    unlocked: false,
    primaryColor: 0xffea00,
    secondaryColor: 0x2979ff,
    accentColor: 0x00e5ff,
    rimColor: 0xffd600,
    underglowColor: 0xffff00,
    sparkColor: [1.0, 0.95, 0.1],
    glowClass: 'skin-glow-yellow',
    description: 'हाई-वोल्टेज थंडरबोल्ट इलेक्ट्रिक स्ट्रोक्स और सुपर बूस्ट।',
  },
];

const STORAGE_KEYS = {
  COINS: 'desk_racer_coins',
  UNLOCKED: 'desk_racer_unlocked_skins',
  SELECTED: 'desk_racer_selected_skin',
  LEVEL: 'desk_racer_max_unlocked_level',
};

class KartSkinManager {
  constructor() {
    this.coins = this.loadCoins();
    this.unlockedSkins = this.loadUnlockedSkins();
    this.selectedSkinId = this.loadSelectedSkin();
    this.listeners = new Set();
  }

  loadCoins() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.COINS);
      if (stored !== null) {
        return Math.max(0, parseInt(stored, 10) || 0);
      }
    } catch (_e) {}
    // Welcome initial coin balance to get started
    return 100;
  }

  saveCoins() {
    try {
      localStorage.setItem(STORAGE_KEYS.COINS, String(this.coins));
    } catch (_e) {}
    this.notify();
  }

  addCoins(amount) {
    if (amount <= 0) return this.coins;
    this.coins += amount;
    this.saveCoins();
    return this.coins;
  }

  spendCoins(amount) {
    if (this.coins < amount) return false;
    this.coins -= amount;
    this.saveCoins();
    return true;
  }

  loadUnlockedSkins() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.UNLOCKED);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.includes('classic_red')) {
          return arr;
        }
      }
    } catch (_e) {}
    return ['classic_red'];
  }

  saveUnlockedSkins() {
    try {
      localStorage.setItem(STORAGE_KEYS.UNLOCKED, JSON.stringify(this.unlockedSkins));
    } catch (_e) {}
    this.notify();
  }

  loadSelectedSkin() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SELECTED);
      if (stored && KART_SKINS.some((s) => s.id === stored)) {
        return stored;
      }
    } catch (_e) {}
    return 'classic_red';
  }

  saveSelectedSkin() {
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED, this.selectedSkinId);
    } catch (_e) {}
    this.notify();
  }

  isSkinUnlocked(skinId) {
    return skinId === 'classic_red' || this.unlockedSkins.includes(skinId);
  }

  unlockSkin(skinId) {
    const skin = KART_SKINS.find((s) => s.id === skinId);
    if (!skin) return { success: false, reason: 'Skin not found' };
    if (this.isSkinUnlocked(skinId)) {
      return { success: true, alreadyUnlocked: true };
    }
    if (this.coins < skin.price) {
      return { success: false, reason: 'सिक्के कम हैं! और सिक्के जुटाएं।' };
    }
    this.coins -= skin.price;
    this.unlockedSkins.push(skinId);
    this.selectedSkinId = skinId;
    this.saveCoins();
    this.saveUnlockedSkins();
    this.saveSelectedSkin();
    return { success: true, skin };
  }

  selectSkin(skinId) {
    if (!this.isSkinUnlocked(skinId)) return false;
    this.selectedSkinId = skinId;
    this.saveSelectedSkin();
    return true;
  }

  getActiveSkin() {
    return KART_SKINS.find((s) => s.id === this.selectedSkinId) || KART_SKINS[0];
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    for (const cb of this.listeners) {
      try {
        cb(this);
      } catch (err) {
        console.error('SkinManager listener error:', err);
      }
    }
  }
}

export const skinManager = new KartSkinManager();
