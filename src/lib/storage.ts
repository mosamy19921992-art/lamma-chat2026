// Tiny typed localStorage helpers. Wraps parse/stringify and survives
// quota / JSON errors so a bad value doesn't break the whole app.

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[storage] Failed to read "${key}":`, err);
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[storage] Failed to write "${key}":`, err);
  }
}

function getString(key: string, fallback = ""): string {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : raw;
  } catch {
    return fallback;
  }
}

function setString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`[storage] Failed to write string "${key}":`, err);
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[storage] Failed to remove "${String(key).replace(/\n|\r/g, ``)}":`, err);
  }
}

/**
 * Read a value, pass it through `updater`, and write the result back.
 * Returns the new value. `updater` receives the previous value (or `null`
 * if it was missing/corrupt) and must return the next value.
 */
function update<T>(key: string, fallback: T, updater: (prev: T | null) => T): T {
  const prev = get<T | null>(key, null);
  const next = updater(prev);
  set(key, next);
  return next ?? fallback;
}

export const storage = {
  get,
  set,
  getString,
  setString,
  remove,
  update,
};

export default storage;
