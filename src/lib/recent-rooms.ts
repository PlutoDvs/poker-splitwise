// Client-side cache of rooms the user has opened on this device, so the
// landing page can offer one-tap reopen, and rooms can be pinned / renamed
// locally. There are no accounts, so this lives in localStorage only.
//
// A room has two access codes (admin + view). Entries are keyed by the code
// that was used, but also carry the room's stable `id` so the same room opened
// under both codes collapses to a single entry (preferring admin access).

export interface RecentRoom {
  id?: string; // stable room id (non-secret); used to dedupe across codes
  code: string; // the access code used (admin or view)
  name: string; // the room's real name, refreshed on each visit
  label?: string; // optional local nickname (rename) that overrides `name`
  mode: "admin" | "view";
  openedAt: number; // epoch ms, for most-recent-first ordering
  pinned?: boolean;
}

const KEY = "poker-ledger:recent-rooms";
const MAX = 12;

// --------------------------------------------------------------------------
// Pure helpers (unit-tested in recent-rooms.test.ts) — no localStorage here.
// --------------------------------------------------------------------------

/** Pinned first, then most-recently-opened. */
export function sortRecent(list: RecentRoom[]): RecentRoom[] {
  return [...list].sort((a, b) => {
    const ap = a.pinned ? 1 : 0;
    const bp = b.pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return (b.openedAt ?? 0) - (a.openedAt ?? 0);
  });
}

/** Keep all pinned rooms; fill the remaining slots with the newest unpinned. */
export function capRecent(list: RecentRoom[], max: number): RecentRoom[] {
  const sorted = sortRecent(list);
  const pinned = sorted.filter((r) => r.pinned);
  const unpinned = sorted.filter((r) => !r.pinned);
  const slots = Math.max(0, max - pinned.length);
  return sortRecent([...pinned, ...unpinned.slice(0, slots)]);
}

/** Collapse entries that refer to the same room (same `id`), preferring admin
 *  access and keeping any local label / pin. Entries without an id are kept. */
export function dedupeById(list: RecentRoom[]): RecentRoom[] {
  const out: RecentRoom[] = [];
  const idIndex = new Map<string, number>();
  for (const r of sortRecent(list)) {
    if (r.id) {
      const existing = idIndex.get(r.id);
      if (existing !== undefined) {
        const keep = out[existing];
        if ((!keep.label || !keep.label.trim()) && r.label && r.label.trim()) {
          keep.label = r.label;
        }
        if (!keep.pinned && r.pinned) keep.pinned = true;
        if (keep.mode !== "admin" && r.mode === "admin") {
          keep.mode = "admin";
          keep.code = r.code;
        }
        continue;
      }
    }
    const copy = { ...r };
    if (r.id) idIndex.set(r.id, out.length);
    out.push(copy);
  }
  return sortRecent(out);
}

/** Insert/refresh a room, preserving any local label and pin on revisit, and
 *  collapsing a prior entry for the same room (by code OR id). The just-opened
 *  room is always retained, even if pinned rooms already fill `max`. */
export function upsertRecent(
  list: RecentRoom[],
  entry: { id?: string; code: string; name: string; mode: "admin" | "view" },
  now: number,
  max: number = MAX
): RecentRoom[] {
  const isSame = (r: RecentRoom) =>
    r.code === entry.code || (!!entry.id && !!r.id && r.id === entry.id);
  const sameRoom = list.filter(isSame);
  const rest = list.filter((r) => !isSame(r));

  const prevLabel = sameRoom.find((r) => r.label && r.label.trim())?.label;
  const prevPinned = sameRoom.some((r) => r.pinned);
  const adminPrior = sameRoom.find((r) => r.mode === "admin");

  // Prefer keeping admin access if we already had it for this room.
  let code = entry.code;
  let mode: "admin" | "view" = entry.mode;
  if (mode !== "admin" && adminPrior) {
    code = adminPrior.code;
    mode = "admin";
  }

  const merged: RecentRoom = {
    id: entry.id ?? sameRoom.find((r) => r.id)?.id,
    code,
    name: entry.name,
    mode,
    openedAt: now,
    label: prevLabel,
    pinned: prevPinned ? true : undefined,
  };

  const capped = capRecent([merged, ...rest], max);
  if (capped.some((r) => r.code === merged.code)) return capped;
  // Every slot was taken by pinned rooms — keep the active room anyway.
  return sortRecent([merged, ...capped]);
}

export function renameRecent(
  list: RecentRoom[],
  code: string,
  label: string
): RecentRoom[] {
  const trimmed = label.trim();
  return list.map((r) =>
    r.code === code ? { ...r, label: trimmed ? trimmed : undefined } : r
  );
}

export function setPinRecent(
  list: RecentRoom[],
  code: string,
  pinned: boolean
): RecentRoom[] {
  return list.map((r) => (r.code === code ? { ...r, pinned } : r));
}

export function removeRecent(list: RecentRoom[], code: string): RecentRoom[] {
  return list.filter((r) => r.code !== code);
}

/** Display name: the local nickname if set, otherwise the real room name. */
export function roomLabel(r: RecentRoom): string {
  return r.label && r.label.trim() ? r.label : r.name;
}

// --------------------------------------------------------------------------
// localStorage wrappers (browser only).
// --------------------------------------------------------------------------

function read(): RecentRoom[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as RecentRoom[]).filter(
      (r) =>
        r &&
        typeof r.code === "string" &&
        typeof r.name === "string" &&
        (r.mode === "admin" || r.mode === "view")
    );
  } catch {
    return [];
  }
}

function write(list: RecentRoom[]): RecentRoom[] {
  const sorted = sortRecent(list);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(sorted));
    } catch {
      // localStorage may be unavailable (private mode / disabled); ignore.
    }
  }
  return sorted;
}

export function getRecentRooms(): RecentRoom[] {
  return dedupeById(read());
}

export function rememberRoom(room: {
  id?: string;
  code: string;
  name: string;
  mode: "admin" | "view";
}): void {
  write(upsertRecent(read(), room, Date.now(), MAX));
}

export function forgetRoom(code: string): RecentRoom[] {
  return dedupeById(write(removeRecent(read(), code)));
}

export function renameRoom(code: string, label: string): RecentRoom[] {
  return dedupeById(write(renameRecent(read(), code, label)));
}

export function togglePinRoom(code: string): RecentRoom[] {
  const list = read();
  const current = list.find((r) => r.code === code);
  return dedupeById(write(setPinRecent(list, code, !current?.pinned)));
}
