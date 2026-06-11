import type { Game, Payment, PlayerId } from "./types";
import { playerNet } from "./verify";

/**
 * Balance convention:
 *   POSITIVE => the player is OWED money (net winner/creditor).
 *   NEGATIVE => the player OWES money (net loser/debtor).
 *
 * balance(p) =
 *     (sum of playerNet over every entry for p across all games)
 *   + (sum of amount for payments where p is the payer/fromPlayerId)
 *   - (sum of amount for payments where p is the payee/toPlayerId)
 *
 * Every player that appears in any game OR any payment is included,
 * even when their balance is 0.
 */
export function computeBalances(
  games: Game[],
  payments: Payment[]
): Record<PlayerId, number> {
  const balances: Record<PlayerId, number> = {};

  const ensure = (playerId: PlayerId): void => {
    if (!Object.prototype.hasOwnProperty.call(balances, playerId)) {
      balances[playerId] = 0;
    }
  };

  // Game results: add each player's net to their balance.
  for (const game of games) {
    for (const entry of game.entries) {
      ensure(entry.playerId);
      balances[entry.playerId] += playerNet(entry);
    }
  }

  // Payments move balances toward 0.
  for (const payment of payments) {
    ensure(payment.fromPlayerId);
    ensure(payment.toPlayerId);
    // Paying down debt moves the payer's balance up toward 0.
    balances[payment.fromPlayerId] += payment.amount;
    // Receiving a payment lowers what the payee is owed.
    balances[payment.toPlayerId] -= payment.amount;
  }

  return balances;
}
