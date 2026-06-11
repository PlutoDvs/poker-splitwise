import "server-only";
import { getServiceClient } from "@/lib/supabase/server";
import { verifyGame, type GameEntry, type VerifyResult } from "@/lib/poker";
import type { GameEntryRow, GameRow, GameView, GameEntryView } from "./types";

export interface NewGameEntry {
  playerId: string;
  buyIns: number[];
  cashOut: number;
}

export interface CreateGameInput {
  roomId: string;
  playedAt: string; // ISO string
  location?: string | null;
  notes?: string | null;
  tolerance: number;
  entries: NewGameEntry[];
}

export interface CreateGameResult {
  ok: boolean;
  gameId?: string;
  verify: VerifyResult;
}

/**
 * Verify the game (buy-ins vs cash-outs within tolerance + structural checks),
 * then persist it atomically. Returns ok=false with the VerifyResult if the
 * game does not pass verification (nothing is written in that case).
 */
export async function createGame(
  input: CreateGameInput
): Promise<CreateGameResult> {
  const entries: GameEntry[] = input.entries.map((e) => ({
    playerId: e.playerId,
    buyIns: e.buyIns,
    cashOut: e.cashOut,
  }));

  const verify = verifyGame(entries, input.tolerance);
  if (!verify.ok) {
    return { ok: false, verify };
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("create_game", {
    p_room_id: input.roomId,
    p_played_at: input.playedAt,
    p_location: input.location ?? null,
    p_notes: input.notes ?? null,
    p_total_buy_in: verify.totalBuyIn,
    p_total_cash_out: verify.totalCashOut,
    p_discrepancy: verify.discrepancy,
    p_entries: input.entries.map((e) => ({
      player_id: e.playerId,
      buy_ins: e.buyIns,
      cash_out: e.cashOut,
    })),
  });
  if (error) throw new Error(`Failed to save game: ${error.message}`);

  return { ok: true, gameId: data as string, verify };
}

export async function deleteGame(gameId: string): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase.from("games").delete().eq("id", gameId);
  if (error) throw new Error(error.message);
}

type GameRowWithEntries = GameRow & { game_entries: GameEntryRow[] };

function toGameView(
  row: GameRowWithEntries,
  nameById: Map<string, string>
): GameView {
  const entries: GameEntryView[] = row.game_entries.map((e) => {
    const totalBuyIn = e.buy_ins.reduce((sum, b) => sum + b, 0);
    return {
      playerId: e.player_id,
      playerName: nameById.get(e.player_id) ?? "(unknown)",
      buyIns: e.buy_ins,
      totalBuyIn,
      cashOut: e.cash_out,
      net: e.cash_out - totalBuyIn,
    };
  });
  // Winners first.
  entries.sort((a, b) => b.net - a.net);

  return {
    id: row.id,
    playedAt: row.played_at,
    location: row.location,
    notes: row.notes,
    totalBuyIn: row.total_buy_in,
    totalCashOut: row.total_cash_out,
    discrepancy: row.discrepancy,
    entries,
  };
}

export async function listGames(
  roomId: string,
  nameById: Map<string, string>
): Promise<GameView[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("games")
    .select("*, game_entries(*)")
    .eq("room_id", roomId)
    .order("played_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as GameRowWithEntries[]).map((r) => toGameView(r, nameById));
}

export async function getGame(
  gameId: string,
  nameById: Map<string, string>
): Promise<GameView | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("games")
    .select("*, game_entries(*)")
    .eq("id", gameId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return toGameView(data as GameRowWithEntries, nameById);
}
