import type { Transaction } from "@/lib/poker";

export type RoomMode = "admin" | "view";

// --- Raw DB rows (snake_case, as returned by Supabase) ---

export interface RoomRow {
  id: string;
  name: string;
  currency_code: string;
  tolerance: number;
  admin_code: string;
  view_code: string;
  created_at: string;
}

export interface PlayerRow {
  id: string;
  room_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface GameRow {
  id: string;
  room_id: string;
  played_at: string;
  location: string | null;
  notes: string | null;
  total_buy_in: number;
  total_cash_out: number;
  discrepancy: number;
  created_at: string;
}

export interface GameEntryRow {
  id: string;
  game_id: string;
  player_id: string;
  buy_ins: number[];
  cash_out: number;
}

export interface PaymentRow {
  id: string;
  room_id: string;
  from_player_id: string;
  to_player_id: string;
  amount: number;
  paid_at: string;
  note: string | null;
  created_at: string;
}

// --- View models (camelCase, for the UI) ---

export interface Room {
  id: string;
  name: string;
  currencyCode: string;
  tolerance: number;
  adminCode: string;
  viewCode: string;
  createdAt: string;
}

export interface Player {
  id: string;
  name: string;
  isActive: boolean;
}

export interface GameEntryView {
  playerId: string;
  playerName: string;
  buyIns: number[];
  totalBuyIn: number;
  cashOut: number;
  net: number;
}

export interface GameView {
  id: string;
  playedAt: string;
  location: string | null;
  notes: string | null;
  totalBuyIn: number;
  totalCashOut: number;
  discrepancy: number;
  entries: GameEntryView[];
}

export interface PaymentView {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  fromName: string;
  toName: string;
  amount: number;
  paidAt: string;
  note: string | null;
}

export interface SimplifiedTransfer extends Transaction {
  fromName: string;
  toName: string;
}

export interface PlayerStat {
  playerId: string;
  name: string;
  isActive: boolean;
  gamesPlayed: number;
  totalNet: number; // sum of nets across all games
  biggestWin: number; // best single-game net (>= 0)
  biggestLoss: number; // worst single-game net (<= 0)
  balance: number; // current running balance (positive => owed money)
}
