// Persistência simples em LocalStorage (recordes + configurações).

const KEY = "cell-defender:v1";

const DEFAULT = {
  bestWave: 0,
  bestTime: 0,
  settings: { sound: true },
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT, settings: { ...DEFAULT.settings } };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT,
      ...parsed,
      settings: { ...DEFAULT.settings, ...(parsed.settings || {}) },
    };
  } catch {
    return { ...DEFAULT, settings: { ...DEFAULT.settings } };
  }
}

export const Save = {
  data: read(),

  persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* modo privado: ignora */
    }
  },

  recordRun(wave, time) {
    let improved = false;
    if (wave > this.data.bestWave) {
      this.data.bestWave = wave;
      improved = true;
    }
    if (time > this.data.bestTime) {
      this.data.bestTime = time;
      improved = true;
    }
    if (improved) this.persist();
    return improved;
  },

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.persist();
  },
};
