import { DEFAULT_SETTINGS, INITIAL_SAVE, SaveData } from './types';

const SAVE_KEY = 'tharos_chains_tartarus_save_v1';

export function loadSavedGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...INITIAL_SAVE,
      ...parsed,
      upgrades: { ...INITIAL_SAVE.upgrades, ...(parsed.upgrades || {}) },
      unlocked: { ...INITIAL_SAVE.unlocked, ...(parsed.unlocked || {}) },
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch {
    return null;
  }
}

export function persistSavedGame(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}
