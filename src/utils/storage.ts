const STORAGE_KEY = 'flowlab-session-v1';

export function readSession<T>(fallback: T): T {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeSession<T>(value: T) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private browsing or a full storage quota should not block the lab session.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Keep Reset Simulation usable even if storage is unavailable.
  }
}
