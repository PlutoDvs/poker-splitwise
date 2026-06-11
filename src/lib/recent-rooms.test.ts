import { describe, it, expect } from "vitest";
import {
  sortRecent,
  capRecent,
  dedupeById,
  upsertRecent,
  renameRecent,
  setPinRecent,
  removeRecent,
  roomLabel,
  type RecentRoom,
} from "./recent-rooms";

function room(
  code: string,
  openedAt: number,
  extra: Partial<RecentRoom> = {}
): RecentRoom {
  return { code, name: code.toUpperCase(), mode: "view", openedAt, ...extra };
}

describe("sortRecent", () => {
  it("orders pinned first, then most-recent", () => {
    const list = [room("a", 1), room("b", 3, { pinned: true }), room("c", 2)];
    expect(sortRecent(list).map((r) => r.code)).toEqual(["b", "c", "a"]);
  });

  it("orders pinned among themselves by recency", () => {
    const list = [
      room("a", 1, { pinned: true }),
      room("b", 5, { pinned: true }),
      room("c", 9),
    ];
    expect(sortRecent(list).map((r) => r.code)).toEqual(["b", "a", "c"]);
  });
});

describe("upsertRecent", () => {
  it("adds a new room stamped with now", () => {
    const out = upsertRecent([], { code: "a", name: "A", mode: "admin" }, 100);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ code: "a", name: "A", mode: "admin", openedAt: 100 });
  });

  it("preserves label and pin on revisit, refreshing name + openedAt + mode", () => {
    const prev = [room("a", 1, { label: "Nick", pinned: true, name: "Old", mode: "view" })];
    const out = upsertRecent(prev, { code: "a", name: "New", mode: "admin" }, 50);
    expect(out[0]).toMatchObject({
      code: "a",
      name: "New",
      mode: "admin",
      openedAt: 50,
      label: "Nick",
      pinned: true,
    });
  });

  it("dedupes by code", () => {
    const out = upsertRecent([room("a", 1)], { code: "a", name: "A", mode: "view" }, 2);
    expect(out).toHaveLength(1);
    expect(out[0].openedAt).toBe(2);
  });
});

describe("capRecent", () => {
  it("keeps the newest unpinned up to max, evicting the oldest", () => {
    const list = [room("a", 1), room("b", 2), room("c", 3)];
    expect(capRecent(list, 2).map((r) => r.code)).toEqual(["c", "b"]);
  });

  it("never evicts pinned, even beyond max", () => {
    const list = [
      room("a", 1, { pinned: true }),
      room("b", 2, { pinned: true }),
      room("c", 3),
      room("d", 4),
    ];
    const out = capRecent(list, 2);
    expect([...out.map((r) => r.code)].sort()).toEqual(["a", "b"]);
  });

  it("fills remaining slots after pinned with newest unpinned", () => {
    const list = [
      room("a", 1, { pinned: true }),
      room("b", 2),
      room("c", 3),
      room("d", 4),
    ];
    expect(capRecent(list, 3).map((r) => r.code)).toEqual(["a", "d", "c"]);
  });
});

describe("rename / pin / remove / label", () => {
  it("rename sets a trimmed label and clears it when blank", () => {
    const named = renameRecent([room("a", 1)], "a", "  My Game  ");
    expect(named[0].label).toBe("My Game");
    const cleared = renameRecent(named, "a", "   ");
    expect(cleared[0].label).toBeUndefined();
  });

  it("setPin sets the flag", () => {
    expect(setPinRecent([room("a", 1)], "a", true)[0].pinned).toBe(true);
    expect(setPinRecent([room("a", 1, { pinned: true })], "a", false)[0].pinned).toBe(false);
  });

  it("remove drops the matching code only", () => {
    expect(
      removeRecent([room("a", 1), room("b", 2)], "a").map((r) => r.code)
    ).toEqual(["b"]);
  });

  it("roomLabel prefers the local label", () => {
    expect(roomLabel(room("a", 1, { name: "Real", label: "Nick" }))).toBe("Nick");
    expect(roomLabel(room("a", 1, { name: "Real" }))).toBe("Real");
    expect(roomLabel(room("a", 1, { name: "Real", label: "   " }))).toBe("Real");
  });
});

describe("upsertRecent — pinned overflow", () => {
  it("keeps the just-opened room even when pinned rooms fill max", () => {
    const pins = [
      room("p0", 1, { pinned: true }),
      room("p1", 2, { pinned: true }),
      room("p2", 3, { pinned: true }),
    ];
    const out = upsertRecent(pins, { code: "new", name: "New", mode: "view" }, 100, 3);
    expect(out.some((r) => r.code === "new")).toBe(true);
    expect(out.filter((r) => r.pinned)).toHaveLength(3);
  });
});

describe("upsertRecent — same room under two access codes", () => {
  it("collapses to one entry by room id, preferring the just-opened admin code", () => {
    const prev = [room("viewcode", 1, { id: "r1", mode: "view", name: "Game" })];
    const out = upsertRecent(prev, { id: "r1", code: "admincode", name: "Game", mode: "admin" }, 2);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "r1", code: "admincode", mode: "admin" });
  });

  it("keeps admin access when the same room is later opened via its view link", () => {
    const prev = [room("admincode", 5, { id: "r1", mode: "admin" })];
    const out = upsertRecent(prev, { id: "r1", code: "viewcode", name: "Game", mode: "view" }, 9);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "r1", code: "admincode", mode: "admin", openedAt: 9 });
  });
});

describe("dedupeById", () => {
  it("merges two entries for the same room id, preferring admin", () => {
    const list = [
      room("viewcode", 5, { id: "r1", mode: "view" }),
      room("admincode", 2, { id: "r1", mode: "admin" }),
    ];
    const out = dedupeById(list);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "r1", mode: "admin", code: "admincode" });
  });

  it("carries over pin and label when merging", () => {
    const list = [
      room("viewcode", 5, { id: "r1", mode: "view" }),
      room("admincode", 2, { id: "r1", mode: "admin", pinned: true, label: "Nick" }),
    ];
    expect(dedupeById(list)[0]).toMatchObject({ mode: "admin", pinned: true, label: "Nick" });
  });

  it("keeps entries that have no id", () => {
    expect(dedupeById([room("a", 1), room("b", 2)])).toHaveLength(2);
  });
});
