import type { PlayerId, Transaction } from "./types";

interface Party {
  playerId: PlayerId;
  amount: number; // creditors: positive (owed); debtors: positive magnitude of debt
}

/**
 * Standard greedy minimal-cash-flow settlement.
 *
 * At every step we pick the creditor with the largest outstanding balance and
 * the debtor with the largest outstanding debt, settle the smaller of the two,
 * and repeat. Re-selecting the maximum each iteration (rather than walking a
 * one-time sort) keeps the transaction count minimal.
 *
 * Determinism: the maximum is chosen by amount descending, breaking ties by
 * playerId ascending, so the result is independent of key insertion order and
 * identical input always yields identical output.
 *
 * Nonzero-sum input (a tolerated chip-count discrepancy): we settle pairs until
 * one side is exhausted. Whatever cannot be matched stays as a residual on the
 * remaining party; we never throw and never fabricate a balancing transaction.
 *
 * The input record is never mutated.
 */
export function simplifyDebts(
  balances: Record<PlayerId, number>
): Transaction[] {
  const creditors: Party[] = [];
  const debtors: Party[] = [];

  for (const playerId of Object.keys(balances)) {
    const amount = balances[playerId];
    if (amount > 0) {
      creditors.push({ playerId, amount });
    } else if (amount < 0) {
      debtors.push({ playerId, amount: -amount });
    }
    // zero balances are ignored.
  }

  // Index of the party with the largest amount (ties broken by playerId
  // ascending), or -1 when no party with a positive amount remains.
  const pickLargest = (parties: Party[]): number => {
    let best = -1;
    for (let i = 0; i < parties.length; i += 1) {
      const candidate = parties[i];
      if (candidate.amount <= 0) continue;
      if (best === -1) {
        best = i;
        continue;
      }
      const current = parties[best];
      if (
        candidate.amount > current.amount ||
        (candidate.amount === current.amount &&
          candidate.playerId < current.playerId)
      ) {
        best = i;
      }
    }
    return best;
  };

  const transactions: Transaction[] = [];

  for (;;) {
    const ci = pickLargest(creditors);
    const di = pickLargest(debtors);
    if (ci === -1 || di === -1) break;

    const creditor = creditors[ci];
    const debtor = debtors[di];

    // Both amounts are positive integers, so the transfer is a positive
    // integer and creditor !== debtor (no player is both owed and owing).
    const amount = Math.min(creditor.amount, debtor.amount);
    transactions.push({
      fromPlayerId: debtor.playerId,
      toPlayerId: creditor.playerId,
      amount,
    });

    creditor.amount -= amount;
    debtor.amount -= amount;
  }

  return transactions;
}
