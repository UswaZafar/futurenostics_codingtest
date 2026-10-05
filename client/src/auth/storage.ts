import type { AuthSession } from "../types";

const storageKey = "taskhub.auth";

export function readAuth(): AuthSession | null {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.user) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveAuth(session: AuthSession): void {
  localStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearAuth(): void {
  localStorage.removeItem(storageKey);
}
