import { describe, it, expect } from "vitest";
import {
  verifyGame,
  playerNet,
  computeBalances,
  simplifyDebts,
} from "./index";
import type { GameEntry, Game, Payment, Transaction } from "./index";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Apply a list of transactions against a balances map and return the residual. */
function applyTransactions(
  balances: Record<string, number>,
  txs: Transaction[],
): Record<string, number> {
  const result: Record<string, number> = { ...balances };
  for (const tx of txs) {
    // debtor pays creditor: debtor's balance moves up (toward 0),
    // creditor's balance moves down (toward 0).
    result[tx.fromPlayerId] = (result[tx.fromPlayerId] ?? 0) + tx.amount;
    result[tx.toPlayerId] = (result[tx.toPlayerId] ?? 0) - tx.amount;
  }
  return result;
}

function countNonZero(balances: Record<string, number>): number {
  return Object.values(balances).filter((v) => v !== 0).length;
}

function entry(
  playerId: string,
  buyIns: number[],
  cashOut: number,
): GameEntry {
  return { playerId, buyIns, cashOut };
}

function isInteger(n: number): boolean {
  return Number.isInteger(n);
}

function sum(balances: Record<string, number>): number {
  return Object.values(balances).reduce((s, v) => s + v, 0);
}

// ---------------------------------------------------------------------------
// playerNet
// ---------------------------------------------------------------------------

describe("playerNet", () => {
  it("computes cashOut - sum(buyIns) for a single buy-in", () => {
    expect(playerNet(entry("a", [100], 250))).toBe(150);
  });

  it("sums multiple buy-ins (re-buys) before subtracting", () => {
    expect(playerNet(entry("a", [100, 50, 25], 100))).toBe(-75);
  });

  it("returns negative net for a busted player (cashOut 0)", () => {
    expect(playerNet(entry("a", [500], 0))).toBe(-500);
  });

  it("returns 0 when cashOut equals total buy-in", () => {
    expect(playerNet(entry("a", [200, 300], 500))).toBe(0);
  });

  it("handles a single re-buy of length 1 and many re-buys identically by sum", () => {
    expect(playerNet(entry("a", [600], 100))).toBe(-500);
    expect(playerNet(entry("a", [100, 100, 100, 100, 100, 100], 100))).toBe(
      -500,
    );
  });

  it("does not mutate the entry's buyIns array", () => {
    const e = entry("a", [10, 20], 5);
    const before = [...e.buyIns];
    playerNet(e);
    expect(e.buyIns).toEqual(before);
  });

  it("stays integer-exact for large minor-unit values", () => {
    // big Toman-style numbers, no float rounding allowed
    const net = playerNet(entry("a", [1_000_000, 2_000_000], 2_999_999));
    expect(net).toBe(-1);
    expect(isInteger(net)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// verifyGame -- totals & discrepancy
// ---------------------------------------------------------------------------

describe("verifyGame: totals and discrepancy", () => {
  it("computes totals for an exactly balanced game", () => {
    const entries = [entry("a", [100], 150), entry("b", [100], 50)];
    const r = verifyGame(entries, 0);
    expect(r.totalBuyIn).toBe(200);
    expect(r.totalCashOut).toBe(200);
    expect(r.discrepancy).toBe(0);
    expect(r.withinTolerance).toBe(true);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("sums re-buys into totalBuyIn", () => {
    const entries = [entry("a", [100, 100], 50), entry("b", [50], 200)];
    const r = verifyGame(entries, 0);
    expect(r.totalBuyIn).toBe(250);
    expect(r.totalCashOut).toBe(250);
    expect(r.discrepancy).toBe(0);
    expect(r.ok).toBe(true);
  });

  it("discrepancy = totalCashOut - totalBuyIn, positive when more cashed out", () => {
    const entries = [entry("a", [100], 160), entry("b", [100], 45)];
    const r = verifyGame(entries, 0);
    expect(r.totalBuyIn).toBe(200);
    expect(r.totalCashOut).toBe(205);
    expect(r.discrepancy).toBe(5);
    expect(r.discrepancy).toBe(r.totalCashOut - r.totalBuyIn);
  });

  it("discrepancy is negative when less cashed out than bought in", () => {
    const entries = [entry("a", [100], 90), entry("b", [100], 95)];
    const r = verifyGame(entries, 0);
    expect(r.discrepancy).toBe(-15);
  });

  it("always computes totals even when structural errors exist", () => {
    // duplicate player; totals still summed across all entries
    const entries = [entry("a", [100], 100), entry("a", [100], 100)];
    const r = verifyGame(entries, 0);
    expect(r.totalBuyIn).toBe(200);
    expect(r.totalCashOut).toBe(200);
    expect(r.discrepancy).toBe(0);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false); // structural error blocks ok even though balanced
  });

  it("computes totals across many entries with mixed re-buys and busts", () => {
    const entries = [
      entry("a", [100, 50], 300),
      entry("b", [200], 0),
      entry("c", [100], 50),
    ];
    const r = verifyGame(entries, 0);
    expect(r.totalBuyIn).toBe(450);
    expect(r.totalCashOut).toBe(350);
    expect(r.discrepancy).toBe(-100);
  });
});

// ---------------------------------------------------------------------------
// verifyGame -- tolerance behavior
// ---------------------------------------------------------------------------

describe("verifyGame: tolerance", () => {
  it("a nonzero discrepancy strictly within tolerance is ok (intentional slack)", () => {
    const entries = [entry("a", [100], 103), entry("b", [100], 99)];
    const r = verifyGame(entries, 5);
    expect(r.discrepancy).toBe(2);
    expect(r.withinTolerance).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("discrepancy exactly equal to tolerance is within tolerance (<=)", () => {
    const entries = [entry("a", [100], 105), entry("b", [100], 100)];
    const r = verifyGame(entries, 5);
    expect(r.discrepancy).toBe(5);
    expect(r.withinTolerance).toBe(true);
    expect(r.ok).toBe(true);
  });

  it("negative discrepancy with abs equal to tolerance is within tolerance", () => {
    const entries = [entry("a", [100], 95), entry("b", [100], 100)];
    const r = verifyGame(entries, 5);
    expect(r.discrepancy).toBe(-5);
    expect(r.withinTolerance).toBe(true);
    expect(r.ok).toBe(true);
  });

  it("discrepancy one over tolerance is NOT within tolerance and not ok", () => {
    const entries = [entry("a", [100], 106), entry("b", [100], 100)];
    const r = verifyGame(entries, 5);
    expect(r.discrepancy).toBe(6);
    expect(r.withinTolerance).toBe(false);
    expect(r.ok).toBe(false);
  });

  it("negative discrepancy over tolerance (abs) is not within tolerance", () => {
    const entries = [entry("a", [100], 90), entry("b", [100], 99)];
    const r = verifyGame(entries, 5);
    expect(r.discrepancy).toBe(-11);
    expect(r.withinTolerance).toBe(false);
    expect(r.ok).toBe(false);
  });

  it("tolerance 0 allows only exact balance", () => {
    const exact = verifyGame([entry("a", [10], 12), entry("b", [10], 8)], 0);
    expect(exact.ok).toBe(true);
    const off = verifyGame([entry("a", [10], 13), entry("b", [10], 8)], 0);
    expect(off.withinTolerance).toBe(false);
    expect(off.ok).toBe(false);
  });

  it("large tolerance tolerates a large discrepancy with no structural errors", () => {
    const entries = [entry("a", [100], 1000), entry("b", [100], 100)];
    const r = verifyGame(entries, 1000);
    expect(r.discrepancy).toBe(900);
    expect(r.withinTolerance).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("negative tolerance is treated as 0 AND records an error", () => {
    const entries = [entry("a", [100], 103), entry("b", [100], 100)];
    const r = verifyGame(entries, -5);
    // treated as 0 => discrepancy 3 is NOT within tolerance
    expect(r.discrepancy).toBe(3);
    expect(r.withinTolerance).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });

  it("non-integer tolerance is treated as 0 AND records an error", () => {
    const entries = [entry("a", [100], 100), entry("b", [100], 100)];
    const r = verifyGame(entries, 2.5);
    // balanced, but invalid tolerance must be flagged as an error
    expect(r.discrepancy).toBe(0);
    expect(r.withinTolerance).toBe(true); // 0 discrepancy within tolerance-0
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false); // error present blocks ok
  });

  it("negative tolerance with an exactly balanced game still errors (ok=false)", () => {
    const r = verifyGame([entry("a", [10], 10), entry("b", [10], 10)], -1);
    expect(r.discrepancy).toBe(0);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });

  it("NaN tolerance is treated as 0 AND records an error", () => {
    const r = verifyGame([entry("a", [10], 10), entry("b", [10], 10)], NaN);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });

  it("Infinity tolerance is treated as 0 AND records an error", () => {
    const r = verifyGame(
      [entry("a", [10], 10), entry("b", [10], 10)],
      Infinity,
    );
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// verifyGame -- structural validation
// ---------------------------------------------------------------------------

describe("verifyGame: structural errors", () => {
  it("flags fewer than 2 players (single entry)", () => {
    const r = verifyGame([entry("a", [100], 100)], 0);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });

  it("flags empty entries list (0 players)", () => {
    const r = verifyGame([], 0);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.totalBuyIn).toBe(0);
    expect(r.totalCashOut).toBe(0);
    expect(r.discrepancy).toBe(0);
    expect(r.ok).toBe(false);
  });

  it("accepts exactly 2 players (lower boundary)", () => {
    const r = verifyGame([entry("a", [50], 50), entry("b", [50], 50)], 0);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("flags duplicate playerId", () => {
    const r = verifyGame(
      [entry("a", [100], 100), entry("a", [100], 100), entry("b", [50], 50)],
      0,
    );
    expect(r.errors.some((e) => /duplicate/i.test(e))).toBe(true);
    expect(r.ok).toBe(false);
  });

  it("flags an entry with no buy-ins (empty array)", () => {
    const r = verifyGame([entry("a", [], 0), entry("b", [100], 100)], 0);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });

  it("flags a non-positive buy-in (zero)", () => {
    const r = verifyGame([entry("a", [0], 0), entry("b", [100], 100)], 0);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });

  it("flags a negative buy-in", () => {
    const r = verifyGame([entry("a", [-50], 0), entry("b", [100], 50)], 0);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });

  it("flags a non-integer buy-in", () => {
    const r = verifyGame([entry("a", [10.5], 10), entry("b", [100], 100)], 0);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });

  it("flags a non-integer buy-in among valid ones (re-buy edge)", () => {
    const r = verifyGame(
      [entry("a", [100, 0.5], 100), entry("b", [100], 100)],
      0,
    );
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });

  it("flags a NaN buy-in (not an integer)", () => {
    const r = verifyGame([entry("a", [NaN], 0), entry("b", [100], 100)], 0);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });

  it("flags an Infinity buy-in (not an integer)", () => {
    const r = verifyGame(
      [entry("a", [Infinity], 0), entry("b", [100], 100)],
      0,
    );
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });

  it("flags a negative cashOut", () => {
    const r = verifyGame([entry("a", [100], -1), entry("b", [100], 100)], 0);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });

  it("flags a non-integer cashOut", () => {
    const r = verifyGame(
      [entry("a", [100], 99.99), entry("b", [100], 100)],
      0,
    );
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });

  it("flags a NaN cashOut", () => {
    const r = verifyGame([entry("a", [100], NaN), entry("b", [100], 100)], 0);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });

  it("accepts cashOut of exactly 0 (busted) as structurally valid", () => {
    const r = verifyGame([entry("a", [100], 0), entry("b", [100], 200)], 0);
    expect(r.errors).toEqual([]);
    expect(r.discrepancy).toBe(0);
    expect(r.ok).toBe(true);
  });

  it("accumulates MULTIPLE distinct structural errors at once", () => {
    // single player (only 1 entry) + non-positive buy-in + negative cashOut
    const r = verifyGame([entry("a", [0], -5)], 0);
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
    expect(r.ok).toBe(false);
  });

  it("does not throw on adversarial empty + bad tolerance combo", () => {
    expect(() => verifyGame([], -3)).not.toThrow();
    const r = verifyGame([], -3);
    expect(r.ok).toBe(false);
  });

  it("does not mutate the entries array passed in", () => {
    const entries = [entry("a", [100, 50], 120), entry("b", [70], 100)];
    const snapshot = JSON.stringify(entries);
    verifyGame(entries, 5);
    expect(JSON.stringify(entries)).toBe(snapshot);
  });
});

// ---------------------------------------------------------------------------
// computeBalances
// ---------------------------------------------------------------------------

describe("computeBalances: single game", () => {
  it("winner positive, loser negative", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        entries: [entry("a", [100], 150), entry("b", [100], 50)],
      },
    ];
    const balances = computeBalances(games, []);
    expect(balances["a"]).toBe(50);
    expect(balances["b"]).toBe(-50);
  });

  it("sums to 0 for an exactly balanced game with no payments", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        entries: [
          entry("a", [100], 250),
          entry("b", [100], 0),
          entry("c", [100], 50),
        ],
      },
    ];
    const balances = computeBalances(games, []);
    expect(sum(balances)).toBe(0);
  });

  it("includes a busted player with their negative balance", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        entries: [entry("a", [100], 200), entry("b", [100], 0)],
      },
    ];
    const balances = computeBalances(games, []);
    expect(balances["b"]).toBe(-100);
    expect(balances["a"]).toBe(100);
  });

  it("balance equals sum of playerNet across the game's entries", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        entries: [entry("a", [100, 100], 250), entry("b", [50], 0)],
      },
    ];
    const balances = computeBalances(games, []);
    expect(balances["a"]).toBe(playerNet(entry("a", [100, 100], 250)));
    expect(balances["b"]).toBe(playerNet(entry("b", [50], 0)));
  });
});

describe("computeBalances: multiple games & partial participation", () => {
  it("accumulates net across multiple games", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        entries: [entry("a", [100], 150), entry("b", [100], 50)],
      },
      {
        id: "g2",
        playedAt: "2026-01-02",
        entries: [entry("a", [100], 50), entry("b", [100], 150)],
      },
    ];
    const balances = computeBalances(games, []);
    // a: +50 then -50 => 0 ; b: -50 then +50 => 0
    expect(balances["a"]).toBe(0);
    expect(balances["b"]).toBe(0);
  });

  it("includes a player present in only one of several games", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        entries: [entry("a", [100], 150), entry("b", [100], 50)],
      },
      {
        id: "g2",
        playedAt: "2026-01-02",
        entries: [entry("a", [100], 50), entry("c", [100], 150)],
      },
    ];
    const balances = computeBalances(games, []);
    expect(balances["a"]).toBe(50 - 50); // 0 across two games
    expect(balances["b"]).toBe(-50);
    expect(balances["c"]).toBe(50);
    expect(Object.keys(balances).sort()).toEqual(["a", "b", "c"]);
  });

  it("includes every player even with a zero net balance", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        entries: [entry("a", [100], 100), entry("b", [100], 100)],
      },
    ];
    const balances = computeBalances(games, []);
    expect(Object.prototype.hasOwnProperty.call(balances, "a")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(balances, "b")).toBe(true);
    expect(balances["a"]).toBe(0);
    expect(balances["b"]).toBe(0);
  });

  it("preserves nonzero sum for a tolerated discrepancy (no silent adjustment)", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        // cashed out 5 more than bought in
        entries: [entry("a", [100], 105), entry("b", [100], 100)],
      },
    ];
    const balances = computeBalances(games, []);
    expect(sum(balances)).toBe(5);
    expect(balances["a"]).toBe(5);
    expect(balances["b"]).toBe(0);
  });

  it("accumulates tolerated discrepancies across multiple games without adjustment", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        entries: [entry("a", [100], 103), entry("b", [100], 100)], // +3
      },
      {
        id: "g2",
        playedAt: "2026-01-02",
        entries: [entry("a", [100], 100), entry("b", [100], 98)], // -2
      },
    ];
    const balances = computeBalances(games, []);
    expect(sum(balances)).toBe(1);
  });
});

describe("computeBalances: payments and sign convention", () => {
  it("payer's balance moves UP toward 0; payee's balance moves DOWN", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        entries: [entry("a", [100], 150), entry("b", [100], 50)],
      },
    ];
    // b owes 50, a is owed 50. b pays a 50 -> both settle to 0.
    const payments: Payment[] = [
      {
        id: "p1",
        fromPlayerId: "b",
        toPlayerId: "a",
        amount: 50,
        paidAt: "2026-01-03",
      },
    ];
    const balances = computeBalances(games, payments);
    expect(balances["a"]).toBe(0);
    expect(balances["b"]).toBe(0);
  });

  it("partial payment leaves correct remaining balances", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        entries: [entry("a", [100], 200), entry("b", [100], 0)],
      },
    ];
    const payments: Payment[] = [
      {
        id: "p1",
        fromPlayerId: "b",
        toPlayerId: "a",
        amount: 30,
        paidAt: "2026-01-03",
      },
    ];
    const balances = computeBalances(games, payments);
    // a was +100, receives 30 => +70 ; b was -100, pays 30 => -70
    expect(balances["a"]).toBe(70);
    expect(balances["b"]).toBe(-70);
  });

  it("can over-pay, flipping the sign of balances (no clamping)", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        entries: [entry("a", [100], 150), entry("b", [100], 50)],
      },
    ];
    const payments: Payment[] = [
      {
        id: "p1",
        fromPlayerId: "b",
        toPlayerId: "a",
        amount: 80,
        paidAt: "2026-01-03",
      },
    ];
    const balances = computeBalances(games, payments);
    // a +50 - 80 = -30 ; b -50 + 80 = +30
    expect(balances["a"]).toBe(-30);
    expect(balances["b"]).toBe(30);
  });

  it("includes players that appear ONLY in payments (never in any game)", () => {
    const payments: Payment[] = [
      {
        id: "p1",
        fromPlayerId: "x",
        toPlayerId: "y",
        amount: 40,
        paidAt: "2026-01-03",
      },
    ];
    const balances = computeBalances([], payments);
    expect(Object.keys(balances).sort()).toEqual(["x", "y"]);
    // payer up by amount, payee down by amount
    expect(balances["x"]).toBe(40);
    expect(balances["y"]).toBe(-40);
  });

  it("accumulates multiple payments by the same payer", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        entries: [
          entry("a", [100], 250),
          entry("b", [100], 50),
          entry("c", [100], 0),
        ],
      },
    ];
    const payments: Payment[] = [
      {
        id: "p1",
        fromPlayerId: "c",
        toPlayerId: "a",
        amount: 60,
        paidAt: "2026-01-03",
      },
      {
        id: "p2",
        fromPlayerId: "c",
        toPlayerId: "a",
        amount: 40,
        paidAt: "2026-01-04",
      },
    ];
    const balances = computeBalances(games, payments);
    // a: +150 - 100 received = +50 ; c: -100 + 100 paid = 0
    expect(balances["a"]).toBe(50);
    expect(balances["c"]).toBe(0);
    expect(balances["b"]).toBe(-50);
  });

  it("a player who is both payer and payee nets the two payment legs", () => {
    // m pays 30 (balance +30) and receives 10 (balance -10) => net +20
    const payments: Payment[] = [
      {
        id: "p1",
        fromPlayerId: "m",
        toPlayerId: "n",
        amount: 30,
        paidAt: "2026-01-03",
      },
      {
        id: "p2",
        fromPlayerId: "k",
        toPlayerId: "m",
        amount: 10,
        paidAt: "2026-01-04",
      },
    ];
    const balances = computeBalances([], payments);
    expect(balances["m"]).toBe(20);
    expect(balances["n"]).toBe(-30);
    expect(balances["k"]).toBe(10);
    expect(sum(balances)).toBe(0);
  });

  it("does not mutate input games or payments", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        entries: [entry("a", [100], 150), entry("b", [100], 50)],
      },
    ];
    const payments: Payment[] = [
      {
        id: "p1",
        fromPlayerId: "b",
        toPlayerId: "a",
        amount: 10,
        paidAt: "2026-01-03",
      },
    ];
    const gSnap = JSON.stringify(games);
    const pSnap = JSON.stringify(payments);
    computeBalances(games, payments);
    expect(JSON.stringify(games)).toBe(gSnap);
    expect(JSON.stringify(payments)).toBe(pSnap);
  });

  it("handles no games and no payments (empty map)", () => {
    expect(computeBalances([], [])).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// simplifyDebts
// ---------------------------------------------------------------------------

describe("simplifyDebts: basic correctness", () => {
  it("emits a single transaction for a simple two-party debt", () => {
    const txs = simplifyDebts({ a: 50, b: -50 });
    expect(txs).toEqual([{ fromPlayerId: "b", toPlayerId: "a", amount: 50 }]);
  });

  it("emits nothing when all balances are zero", () => {
    expect(simplifyDebts({ a: 0, b: 0, c: 0 })).toEqual([]);
  });

  it("emits nothing for an empty balances map", () => {
    expect(simplifyDebts({})).toEqual([]);
  });

  it("settles balanced multi-party input to all-zero", () => {
    const balances = { a: 150, b: -50, c: -100 };
    const txs = simplifyDebts(balances);
    const residual = applyTransactions(balances, txs);
    for (const v of Object.values(residual)) {
      expect(v).toBe(0);
    }
  });

  it("transaction count <= (nonzero balances) - 1 for balanced input", () => {
    const balances = { a: 300, b: -100, c: -100, d: -100 };
    const txs = simplifyDebts(balances);
    const nz = countNonZero(balances);
    expect(txs.length).toBeLessThanOrEqual(nz - 1);
    const residual = applyTransactions(balances, txs);
    expect(Object.values(residual).every((v) => v === 0)).toBe(true);
  });

  it("achieves minimality for a many-party balanced input", () => {
    // 4 creditors, 4 debtors, all balanced => at most 7 transactions
    const balances = {
      a: 100,
      b: 200,
      c: 300,
      d: 400,
      e: -250,
      f: -250,
      g: -250,
      h: -250,
    };
    const txs = simplifyDebts(balances);
    const nz = countNonZero(balances);
    expect(txs.length).toBeLessThanOrEqual(nz - 1);
    const residual = applyTransactions(balances, txs);
    expect(Object.values(residual).every((v) => v === 0)).toBe(true);
  });
});

describe("simplifyDebts: invariants on emitted transactions", () => {
  const cases: Array<Record<string, number>> = [
    { a: 50, b: -50 },
    { a: 150, b: -50, c: -100 },
    { a: 300, b: -100, c: -100, d: -100 },
    { a: 100, b: 200, c: -150, d: -150 },
    { a: 7, b: 11, c: -3, d: -15 },
    { a: 1, b: 1, c: 1, d: -3 },
  ];

  for (const balances of cases) {
    it(`all amounts positive integers, no self-transactions for ${JSON.stringify(
      balances,
    )}`, () => {
      const txs = simplifyDebts(balances);
      for (const tx of txs) {
        expect(tx.amount).toBeGreaterThan(0);
        expect(isInteger(tx.amount)).toBe(true);
        expect(tx.fromPlayerId).not.toBe(tx.toPlayerId);
        // debtor pays creditor: from must be a debtor, to must be a creditor
        expect(balances[tx.fromPlayerId]).toBeLessThan(0);
        expect(balances[tx.toPlayerId]).toBeGreaterThan(0);
      }
    });

    it(`zeroes all balances for balanced ${JSON.stringify(balances)}`, () => {
      const txs = simplifyDebts(balances);
      const residual = applyTransactions(balances, txs);
      expect(Object.values(residual).every((v) => v === 0)).toBe(true);
    });

    it(`transaction count is minimal for balanced ${JSON.stringify(
      balances,
    )}`, () => {
      const txs = simplifyDebts(balances);
      const nz = countNonZero(balances);
      expect(txs.length).toBeLessThanOrEqual(nz - 1);
    });
  }

  it("never emits a zero-amount transaction even with a zero-balance bystander", () => {
    const txs = simplifyDebts({ a: 50, b: -50, c: 0 });
    expect(txs.every((t) => t.amount > 0)).toBe(true);
    expect(
      txs.some((t) => t.fromPlayerId === "c" || t.toPlayerId === "c"),
    ).toBe(false);
  });

  it("ignores multiple zero-balance bystanders entirely", () => {
    const txs = simplifyDebts({ z1: 0, a: 70, z2: 0, b: -70, z3: 0 });
    expect(txs).toEqual([{ fromPlayerId: "b", toPlayerId: "a", amount: 70 }]);
  });
});

describe("simplifyDebts: determinism & tie-breaking", () => {
  it("produces identical output for identical input (multiple runs)", () => {
    const balances = { d: 100, a: -100, c: 100, b: -100 };
    const first = simplifyDebts(balances);
    const second = simplifyDebts(balances);
    const third = simplifyDebts({ ...balances });
    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it("is independent of key insertion order", () => {
    const ordered = simplifyDebts({ a: 100, b: 50, c: -75, d: -75 });
    const shuffled = simplifyDebts({ d: -75, c: -75, b: 50, a: 100 });
    expect(shuffled).toEqual(ordered);
  });

  it("breaks ties by playerId ascending among equal creditors and debtors", () => {
    // two creditors +100 each (a,b), two debtors -100 each (c,d).
    // largest balance ties -> pick smallest id 'a'; largest debt ties -> 'c'.
    const txs = simplifyDebts({ a: 100, b: 100, c: -100, d: -100 });
    // deterministic expected pairing: a<-c, b<-d
    expect(txs).toEqual([
      { fromPlayerId: "c", toPlayerId: "a", amount: 100 },
      { fromPlayerId: "d", toPlayerId: "b", amount: 100 },
    ]);
  });

  it("tie-break order is insensitive to scrambled key insertion order", () => {
    const txs = simplifyDebts({ d: -100, b: 100, c: -100, a: 100 });
    expect(txs).toEqual([
      { fromPlayerId: "c", toPlayerId: "a", amount: 100 },
      { fromPlayerId: "d", toPlayerId: "b", amount: 100 },
    ]);
  });

  it("does not mutate the input balances object", () => {
    const balances = { a: 150, b: -50, c: -100 };
    const snapshot = JSON.stringify(balances);
    simplifyDebts(balances);
    expect(JSON.stringify(balances)).toBe(snapshot);
  });
});

describe("simplifyDebts: residual (unbalanced) input", () => {
  it("does not throw when balances do not sum to zero (positive residual)", () => {
    const balances = { a: 105, b: -50, c: -50 }; // sums to +5
    expect(() => simplifyDebts(balances)).not.toThrow();
    const txs = simplifyDebts(balances);
    // settle as much as possible: debtors fully covered, +5 residual on a creditor
    const residual = applyTransactions(balances, txs);
    expect(sum(residual)).toBe(5); // total preserved, settlement does not invent money
    // debtors should be fully settled
    expect(residual["b"]).toBe(0);
    expect(residual["c"]).toBe(0);
    // residual remains on the creditor side
    expect(residual["a"]).toBe(5);
  });

  it("does not throw when balances sum negative (excess debt)", () => {
    const balances = { a: 50, b: -55 }; // sums to -5
    expect(() => simplifyDebts(balances)).not.toThrow();
    const txs = simplifyDebts(balances);
    const residual = applyTransactions(balances, txs);
    expect(sum(residual)).toBe(-5);
    // creditor fully paid; residual debt remains on the debtor
    expect(residual["a"]).toBe(0);
    expect(residual["b"]).toBe(-5);
    for (const tx of txs) {
      expect(tx.amount).toBeGreaterThan(0);
      expect(isInteger(tx.amount)).toBe(true);
    }
  });

  it("residual placement is deterministic across runs", () => {
    const balances = { a: 105, b: -50, c: -50 };
    expect(simplifyDebts(balances)).toEqual(simplifyDebts({ ...balances }));
  });

  it("every emitted residual-case amount is a positive integer, no self txns", () => {
    const balances = { a: 13, b: 8, c: -7, d: -9 }; // sums to +5
    const txs = simplifyDebts(balances);
    for (const tx of txs) {
      expect(tx.amount).toBeGreaterThan(0);
      expect(isInteger(tx.amount)).toBe(true);
      expect(tx.fromPlayerId).not.toBe(tx.toPlayerId);
    }
    expect(sum(applyTransactions(balances, txs))).toBe(5);
  });

  it("emits no transactions when there are only debtors (no creditors)", () => {
    const txs = simplifyDebts({ a: -10, b: -20 });
    expect(txs).toEqual([]);
  });

  it("emits no transactions when there are only creditors (no debtors)", () => {
    const txs = simplifyDebts({ a: 10, b: 20 });
    expect(txs).toEqual([]);
  });

  it("does not mutate input even in the residual case", () => {
    const balances = { a: 105, b: -50, c: -50 };
    const snapshot = JSON.stringify(balances);
    simplifyDebts(balances);
    expect(JSON.stringify(balances)).toBe(snapshot);
  });
});

// ---------------------------------------------------------------------------
// Integration: verify -> balances -> simplify
// ---------------------------------------------------------------------------

describe("integration: full settlement pipeline", () => {
  it("balanced multi-game season settles to zero via simplifyDebts", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        entries: [
          entry("alice", [100], 220),
          entry("bob", [100, 100], 180),
          entry("carol", [100], 0),
        ],
      },
      {
        id: "g2",
        playedAt: "2026-01-08",
        entries: [
          entry("alice", [100], 50),
          entry("bob", [100], 150),
          entry("carol", [100], 100),
        ],
      },
    ];
    // verify each game is exactly balanced
    for (const g of games) {
      expect(verifyGame(g.entries, 0).ok).toBe(true);
    }
    const balances = computeBalances(games, []);
    expect(sum(balances)).toBe(0);

    const txs = simplifyDebts(balances);
    const nz = countNonZero(balances);
    expect(txs.length).toBeLessThanOrEqual(Math.max(0, nz - 1));

    const residual = applyTransactions(balances, txs);
    expect(Object.values(residual).every((v) => v === 0)).toBe(true);
    for (const tx of txs) {
      expect(tx.amount).toBeGreaterThan(0);
      expect(tx.fromPlayerId).not.toBe(tx.toPlayerId);
    }
  });

  it("payments already made reduce the simplified settlement set", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        entries: [entry("a", [100], 150), entry("b", [100], 50)],
      },
    ];
    // b already settled fully
    const payments: Payment[] = [
      {
        id: "p1",
        fromPlayerId: "b",
        toPlayerId: "a",
        amount: 50,
        paidAt: "2026-01-03",
      },
    ];
    const balances = computeBalances(games, payments);
    expect(simplifyDebts(balances)).toEqual([]);
  });

  it("a tolerated-discrepancy season leaves a residual after simplification", () => {
    const games: Game[] = [
      {
        id: "g1",
        playedAt: "2026-01-01",
        // +3 tolerated discrepancy
        entries: [entry("a", [100], 153), entry("b", [100], 50)],
      },
    ];
    const v = verifyGame(games[0].entries, 5);
    expect(v.ok).toBe(true); // tolerated
    const balances = computeBalances(games, []);
    expect(sum(balances)).toBe(3);
    const txs = simplifyDebts(balances);
    expect(() => txs).not.toThrow();
    // settlement preserves total; residual equals the discrepancy
    expect(sum(applyTransactions(balances, txs))).toBe(3);
  });
});
