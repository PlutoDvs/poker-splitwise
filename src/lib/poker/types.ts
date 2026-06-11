export type PlayerId = string;

export interface GameEntry {
  playerId: PlayerId;
  buyIns: number[]; // one or more positive integers (minor units); multiple entries means re-buys
  cashOut: number; // integer minor units, >= 0 (0 means the player busted)
}

export interface Game {
  id: string;
  playedAt: string; // ISO date string
  entries: GameEntry[];
}

export interface Payment {
  id: string;
  fromPlayerId: PlayerId; // payer (a debtor settling up)
  toPlayerId: PlayerId; // payee (a creditor being paid)
  amount: number; // integer minor units, > 0
  paidAt: string; // ISO date string
}

export interface Transaction {
  fromPlayerId: PlayerId;
  toPlayerId: PlayerId;
  amount: number; // integer minor units, > 0
}
