// store.js - localStorage persistence for the University Progress Tracker.
// All storage access is guarded so a disabled/unavailable storage does not
// crash the app.

export const STORAGE_KEY = 'uni-progress-tracker:v1';

function defaultState() {
  return { modules: [] };
}

/**
 * Load state from localStorage. Returns a default empty state if the data is
 * missing, invalid, or storage is unavailable.
 * @returns {{modules:Array}}
 */
export function loadState() {
  try {
    if (typeof localStorage === 'undefined') return defaultState();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.modules)) {
      return defaultState();
    }
    return parsed;
  } catch (_err) {
    return defaultState();
  }
}

/**
 * Persist state to localStorage. Silently ignores failures (e.g. quota or
 * disabled storage).
 * @param {{modules:Array}} state
 * @returns {boolean} true if saved, false otherwise
 */
export function saveState(state) {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (_err) {
    return false;
  }
}
