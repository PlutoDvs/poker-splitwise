import "server-only";
import {
  computeBalances,
  simplifyDebts,
  type Game,
  type Payment,
} from "@/lib/poker";
import { listPlayers } from "./players";
import { listGames } from "./games";
import { listPayments } from "./payments";
import type {
  GameView,
  PaymentView,
  Player,
  PlayerStat,
  Room,
  SimplifiedTransfer,
} from "./types";

export interface RoomState {
  players: Player[];
  games: GameView[];
  payments: PaymentView[];
  balances: Record<string, number>;
  transfers: SimplifiedTransfer[];
  stats: PlayerStat[];
}

/**
 * Fetch everything needed to render a room and derive the settlement state:
 * running balances, the minimal set of settle-up transfers, and per-player
 * stats. All money is in integer minor units.
 */
export async function getRoomState(room: Room): Promise<RoomState> {
  const players = await listPlayers(room.id);
  const nameById = new Map(players.map((p) => [p.id, p.name]));

  const [games, payments] = await Promise.all([
    listGames(room.id, nameById),
    listPayments(room.id, nameById),
  ]);

  const domainGames: Game[] = games.map((g) => ({
    id: g.id,
    playedAt: g.playedAt,
    entries: g.entries.map((e) => ({
      playerId: e.playerId,
      buyIns: e.buyIns,
      cashOut: e.cashOut,
    })),
  }));
  const domainPayments: Payment[] = payments.map((p) => ({
    id: p.id,
    fromPlayerId: p.fromPlayerId,
    toPlayerId: p.toPlayerId,
    amount: p.amount,
    paidAt: p.paidAt,
  }));

  const balances = computeBalances(domainGames, domainPayments);
  const transfers: SimplifiedTransfer[] = simplifyDebts(balances).map((t) => ({
    ...t,
    fromName: nameById.get(t.fromPlayerId) ?? "(unknown)",
    toName: nameById.get(t.toPlayerId) ?? "(unknown)",
  }));

  // Per-player stats.
  const statMap = new Map<string, PlayerStat>();
  for (const p of players) {
    statMap.set(p.id, {
      playerId: p.id,
      name: p.name,
      isActive: p.isActive,
      gamesPlayed: 0,
      totalNet: 0,
      biggestWin: 0,
      biggestLoss: 0,
      balance: balances[p.id] ?? 0,
    });
  }
  for (const g of games) {
    for (const e of g.entries) {
      const stat = statMap.get(e.playerId);
      if (!stat) continue;
      stat.gamesPlayed += 1;
      stat.totalNet += e.net;
      if (e.net > stat.biggestWin) stat.biggestWin = e.net;
      if (e.net < stat.biggestLoss) stat.biggestLoss = e.net;
    }
  }
  const stats = [...statMap.values()].sort((a, b) => b.totalNet - a.totalNet);

  return { players, games, payments, balances, transfers, stats };
}
