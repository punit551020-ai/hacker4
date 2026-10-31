/**
 * LevelManager: Manages game stage progression, dangerous road layouts,
 * hazard configurations, and unlock state.
 *
 * Each level features a uniquely generated 3D road with custom curves, elevations,
 * obstacles, curb colors, and lighting atmosphere.
 * Racing requires exactly 1 LAP to conquer and unlock the next stage!
 */

const STORAGE_KEY_LEVEL = 'desk_racer_max_unlocked_level';

export const LEVEL_DEFINITIONS = [
  {
    id: 1,
    name: 'स्तर 1: डेस्कटॉप क्लासिक (Desktop Classic)',
    subtitle: 'गर्म शाम का ट्रैक · आसान मोड़ · सिक्के जुटाएं',
    difficulty: 'EASY',
    difficultyColor: '#32d74b',
    laps: 1,
    rewardCoins: 120,
    coinCount: 22,
    gemCount: 0,
    oilSlicksCount: 0,
    electricLaserCount: 0,
    boostPadsCount: 2,
    theme: {
      name: 'Classic Amber',
      roadColor: 0x242830,
      curbRed: 0xe8251a,
      curbWhite: 0xf5f7fa,
      ledColor: 0xffaa33,
      fogColor: 0x181312,
      skyDesc: 'Warm desk sunset',
    },
    splineMod: {
      pathType: 'classic',
      heightScale: 1.0,
      waveFreq: 0.0,
      waveAmp: 0.0,
      lateralAmp: 0.0,
      lateralFreq: 0.0,
      bankScale: 1.0,
    },
  },
  {
    id: 2,
    name: 'स्तर 2: बुक माउंटेन रिज (Book Mountain Ridge)',
    subtitle: 'ऊंचे रैंप्स · ऑयल स्पिल खतरा · नए कर्व्स',
    difficulty: 'MEDIUM',
    difficultyColor: '#4cc2ff',
    laps: 1,
    rewardCoins: 180,
    coinCount: 28,
    gemCount: 1,
    oilSlicksCount: 4,
    electricLaserCount: 0,
    boostPadsCount: 3,
    theme: {
      name: 'Emerald Ridge',
      roadColor: 0x182420,
      curbRed: 0x00e676,
      curbWhite: 0x143022,
      ledColor: 0x00e5ff,
      fogColor: 0x091418,
      skyDesc: 'Twilight emerald ridge',
    },
    splineMod: {
      pathType: 'mountain_ridge',
      heightScale: 1.45,
      waveFreq: 2.0,
      waveAmp: 0.022,
      lateralAmp: 0.065,
      lateralFreq: 2.5,
      bankScale: 1.25,
    },
  },
  {
    id: 3,
    name: 'स्तर 3: साइबर नाइट कैनियन (Cyber Night Canyon)',
    subtitle: 'इलेक्ट्रिक लेज़र शॉक बैरियर्स · ज़िग-ज़ैग मोड़',
    difficulty: 'HARD',
    difficultyColor: '#b388ff',
    laps: 1,
    rewardCoins: 280,
    coinCount: 32,
    gemCount: 2,
    oilSlicksCount: 6,
    electricLaserCount: 3,
    boostPadsCount: 4,
    theme: {
      name: 'Cyberpunk Neon',
      roadColor: 0x121424,
      curbRed: 0xd500f9,
      curbWhite: 0x00e5ff,
      ledColor: 0xd500f9,
      fogColor: 0x0a0c16,
      skyDesc: 'Deep midnight neon grid',
    },
    splineMod: {
      pathType: 'cyber_slalom',
      heightScale: 1.65,
      waveFreq: 3.5,
      waveAmp: 0.032,
      lateralAmp: 0.115,
      lateralFreq: 4.0,
      bankScale: 1.45,
    },
  },
  {
    id: 4,
    name: 'स्तर 4: स्टेशनरी डेंजर ब्रिज (Stationery Danger Bridge)',
    subtitle: 'हवा में ऊंचे पुल · डबल लेज़र बैरियर · खतरनाक ढलान',
    difficulty: 'VERY HARD',
    difficultyColor: '#ffd600',
    laps: 1,
    rewardCoins: 400,
    coinCount: 36,
    gemCount: 2,
    oilSlicksCount: 8,
    electricLaserCount: 5,
    boostPadsCount: 5,
    theme: {
      name: 'Industrial Hazard',
      roadColor: 0x1c1c14,
      curbRed: 0xffd600,
      curbWhite: 0x22221a,
      ledColor: 0xffab00,
      fogColor: 0x14120a,
      skyDesc: 'Hazard warning amber',
    },
    splineMod: {
      pathType: 'hazard_bridge',
      heightScale: 1.95,
      waveFreq: 4.5,
      waveAmp: 0.042,
      lateralAmp: 0.145,
      lateralFreq: 5.0,
      bankScale: 1.65,
    },
  },
  {
    id: 5,
    name: 'स्तर 5: लावा कॉफ़ी इन्फर्नो (Lava Coffee Inferno)',
    subtitle: 'खौलता हुआ कॉफी सागर · भयानक रोलरकोस्टर लूप्स',
    difficulty: 'EXTREME',
    difficultyColor: '#ff3d00',
    laps: 1,
    rewardCoins: 550,
    coinCount: 42,
    gemCount: 3,
    oilSlicksCount: 10,
    electricLaserCount: 7,
    boostPadsCount: 6,
    theme: {
      name: 'Magma Flame',
      roadColor: 0x240d0a,
      curbRed: 0xff3d00,
      curbWhite: 0xffab00,
      ledColor: 0xff3d00,
      fogColor: 0x1a0a08,
      skyDesc: 'Molten volcanic dusk',
    },
    splineMod: {
      pathType: 'magma_inferno',
      heightScale: 2.25,
      waveFreq: 5.5,
      waveAmp: 0.052,
      lateralAmp: 0.175,
      lateralFreq: 6.0,
      bankScale: 1.85,
    },
  },
];

class LevelManager {
  constructor() {
    this.maxUnlockedLevel = this.loadMaxUnlockedLevel();
    this.currentLevelId = 1;
    this.listeners = new Set();
  }

  loadMaxUnlockedLevel() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LEVEL);
      if (stored !== null) {
        return Math.max(1, parseInt(stored, 10) || 1);
      }
    } catch (_e) {}
    return 1;
  }

  saveMaxUnlockedLevel() {
    try {
      localStorage.setItem(STORAGE_KEY_LEVEL, String(this.maxUnlockedLevel));
    } catch (_e) {}
    this.notify();
  }

  getCurrentLevel() {
    return this.getLevelById(this.currentLevelId);
  }

  getLevelById(levelId) {
    const predefined = LEVEL_DEFINITIONS.find((l) => l.id === levelId);
    if (predefined) return predefined;

    // Infinite procedural levels for level 6+!
    const step = levelId - 5;
    const colors = [0xff0055, 0x00f5ff, 0x9900ff, 0x00ff66, 0xffbb00, 0xff0033];
    const themeCol = colors[(levelId - 1) % colors.length];

    const names = [
      'सुपरनोवा स्टॉर्म (Supernova Storm)',
      'हाइपरसोनिक लूप (Hypersonic Loop)',
      'गैलेक्सी वोर्टेक्स (Galaxy Vortex)',
      'इलेक्ट्रिक स्पाइरल (Electric Spiral)',
      'अल्टीमेट अपोकेलिप्स (Ultimate Apocalypse)',
    ];
    const roadTitle = names[(levelId - 6) % names.length];

    return {
      id: levelId,
      name: `स्तर ${levelId}: ${roadTitle}`,
      subtitle: `नया रास्ता ${step} · तेज स्पीड · अत्यधिक लेज़र व ऑयल स्पिल्स`,
      difficulty: 'NIGHTMARE',
      difficultyColor: '#ff0077',
      laps: 1,
      rewardCoins: 550 + step * 120,
      coinCount: Math.min(50, 36 + step * 2),
      gemCount: Math.min(5, 2 + Math.floor(step / 2)),
      oilSlicksCount: Math.min(14, 8 + step),
      electricLaserCount: Math.min(11, 6 + step),
      boostPadsCount: Math.min(8, 5 + Math.floor(step / 2)),
      theme: {
        name: `Chaos Supernova ${step}`,
        roadColor: 0x120e1a,
        curbRed: themeCol,
        curbWhite: 0xffffff,
        ledColor: themeCol,
        fogColor: 0x0a0614,
        skyDesc: 'Supernova infinity storm',
      },
      splineMod: {
        pathType: 'procedural_chaos',
        seed: levelId * 1337,
        heightScale: Math.min(2.5, 2.0 + (step % 5) * 0.1),
        waveFreq: 4.0 + (step % 4),
        waveAmp: Math.min(0.06, 0.04 + (step % 4) * 0.005),
        lateralAmp: Math.min(0.20, 0.12 + (step % 5) * 0.016),
        lateralFreq: 3.5 + (step % 5) * 0.6,
        bankScale: Math.min(2.0, 1.6 + (step % 4) * 0.1),
      },
    };
  }

  unlockNextLevel() {
    const nextLevelId = this.currentLevelId + 1;
    if (nextLevelId > this.maxUnlockedLevel) {
      this.maxUnlockedLevel = nextLevelId;
      this.saveMaxUnlockedLevel();
    }
    return nextLevelId;
  }

  setCurrentLevel(levelId) {
    if (levelId > this.maxUnlockedLevel) {
      return false;
    }
    this.currentLevelId = levelId;
    this.notify();
    return true;
  }

  isLevelUnlocked(levelId) {
    return levelId <= this.maxUnlockedLevel;
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
        console.error('LevelManager listener error:', err);
      }
    }
  }
}

export const levelManager = new LevelManager();
