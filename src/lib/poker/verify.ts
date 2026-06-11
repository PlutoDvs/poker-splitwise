import type { GameEntry } from "./types";

export interface VerifyResult {
  totalBuyIn: number; // sum of all buyIns across all entries
  totalCashOut: number; // sum of all cashOut across all entries
  discrepancy: number; // totalCashOut - totalBuyIn (positive => more cashed out than bought in)
  withinTolerance: boolean; // Math.abs(discrepancy) <= tolerance
  ok: boolean; // true iff errors.length === 0 AND withinTolerance
  errors: string[]; // human-readable structural problems
}

/** Net result for a single entry: cashOut - sum(buyIns). */
export function playerNet(entry: GameEntry): number {
  let buyInSum = 0;
  for (const buyIn of entry.buyIns) {
    buyInSum += buyIn;
  }
  return entry.cashOut - buyInSum;
}

function isInteger(value: number): boolean {
  return Number.isInteger(value);
}

export function verifyGame(entries: GameEntry[], tolerance: number): VerifyResult {
  const errors: string[] = [];

  // tolerance must be an integer >= 0; if not, treat tolerance as 0 and add an error.
  let effectiveTolerance = tolerance;
  if (!isInteger(tolerance) || tolerance < 0) {
    errors.push(
      `tolerance must be an integer >= 0 (received ${tolerance}); treating tolerance as 0.`
    );
    effectiveTolerance = 0;
  }

  // at least 2 players (a game needs >= 2 entries).
  if (entries.length < 2) {
    errors.push(
      `a game needs at least 2 players (found ${entries.length}).`
    );
  }

  // no duplicate playerId across entries.
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.playerId)) {
      errors.push(`duplicate playerId "${entry.playerId}".`);
    } else {
      seen.add(entry.playerId);
    }
  }

  // per-entry structural checks.
  for (const entry of entries) {
    // every entry has at least one buy-in.
    if (entry.buyIns.length < 1) {
      errors.push(`player "${entry.playerId}" has no buy-ins.`);
    }

    // every buy-in is an integer > 0.
    for (const buyIn of entry.buyIns) {
      if (!isInteger(buyIn) || buyIn <= 0) {
        errors.push(
          `player "${entry.playerId}" has an invalid buy-in (${buyIn}); buy-ins must be integers > 0.`
        );
      }
    }

    // cashOut is an integer >= 0.
    if (!isInteger(entry.cashOut) || entry.cashOut < 0) {
      errors.push(
        `player "${entry.playerId}" has an invalid cashOut (${entry.cashOut}); cashOut must be an integer >= 0.`
      );
    }
  }

  // Always compute totals/discrepancy regardless of structural errors.
  let totalBuyIn = 0;
  let totalCashOut = 0;
  for (const entry of entries) {
    for (const buyIn of entry.buyIns) {
      totalBuyIn += buyIn;
    }
    totalCashOut += entry.cashOut;
  }

  const discrepancy = totalCashOut - totalBuyIn;
  const withinTolerance = Math.abs(discrepancy) <= effectiveTolerance;
  const ok = errors.length === 0 && withinTolerance;

  return {
    totalBuyIn,
    totalCashOut,
    discrepancy,
    withinTolerance,
    ok,
    errors,
  };
}
