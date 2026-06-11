// Client-side cache of rooms the user has opened on this device, so the
// landing page can offer one-tap reopen. There are no accounts, so this lives
// in localStorage only. Keyed by the access code (admin or view) that was used.

export interface RecentRoom {
  code: string;
  name: string;
  mode: "admin" | "view";
  openedAt: number; // epoch ms, for most-recent-first ordering
}

const KEY = "poker-ledger:recent-rooms";
const MAX = 12;

export function getRecentRooms(): RecentRoom[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as RecentRoom[])
      .filter(
        (r) =>
          r &&
          typeof r.code === "string" &&
          typeof r.name === "string" &&
          (r.mode === "admin" || r.mode === "view")
      )
      .sort((a, b) => (b.openedAt ?? 0) - (a.openedAt ?? 0));
  } catch {
    return [];
  }
}

export function rememberRoom(room: {
  code: string;
  name: string;
  mode: "admin" | "view";
}): void {
  if (typeof window === "undefined") return;
  try {
    const others = getRecentRooms().filter((r) => r.code !== room.code);
    const next = [{ ...room, openedAt: Date.now() }, ...others].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage may be unavailable (private mode / disabled); ignore.
  }
}

export function forgetRoom(code: string): RecentRoom[] {
  const next = getRecentRooms().filter((r) => r.code !== code);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  return next;
}
