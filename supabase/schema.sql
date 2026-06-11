-- ============================================================================
-- Poker Settlement -- database schema (PostgreSQL / Supabase)
--
-- Run this in the Supabase SQL editor for a new project.
--
-- ACCESS MODEL: "room code, no accounts".
--   - Each room has an admin_code (full edit) and a view_code (read-only).
--   - The browser NEVER queries Supabase directly. All access goes through
--     Next.js server routes that validate the code and use the SERVICE ROLE
--     key. Therefore RLS is ENABLED with NO public policies, which denies the
--     anon key all access. The service role bypasses RLS.
--
-- MONEY: all amounts are INTEGER minor units (whole Toman, or cents for USD/EUR/GBP).
-- ============================================================================

-- gen_random_uuid() is built in to Postgres 13+ (Supabase enables pgcrypto too).

-- ---------------------------------------------------------------------------
-- rooms: a friend group / poker circle
-- ---------------------------------------------------------------------------
create table if not exists public.rooms (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  currency_code text not null default 'IRT',
  tolerance     integer not null default 5000 check (tolerance >= 0),
  admin_code    text not null unique,
  view_code     text not null unique,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- players: a named participant within a room (NOT a login)
-- ---------------------------------------------------------------------------
create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms(id) on delete cascade,
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (room_id, name)
);

-- ---------------------------------------------------------------------------
-- games: one poker session in a room. Totals are stored (computed + verified
-- at save time) so history is immutable even if logic later changes.
-- ---------------------------------------------------------------------------
create table if not exists public.games (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.rooms(id) on delete cascade,
  played_at      timestamptz not null default now(),
  location       text,
  notes          text,
  total_buy_in   integer not null,
  total_cash_out integer not null,
  discrepancy    integer not null, -- total_cash_out - total_buy_in (within tolerance)
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- game_entries: one row per player per game.
-- buy_ins is an integer[] so re-buys are preserved individually; each must be > 0.
-- ---------------------------------------------------------------------------
create table if not exists public.game_entries (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete restrict,
  buy_ins    integer[] not null default '{}',
  cash_out   integer not null default 0 check (cash_out >= 0),
  unique (game_id, player_id)
);

-- ---------------------------------------------------------------------------
-- payments: a real-world settle-up payment from one player to another,
-- which draws down the running balances.
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.rooms(id) on delete cascade,
  from_player_id uuid not null references public.players(id) on delete restrict,
  to_player_id   uuid not null references public.players(id) on delete restrict,
  amount         integer not null check (amount > 0),
  paid_at        timestamptz not null default now(),
  note           text,
  created_at     timestamptz not null default now(),
  check (from_player_id <> to_player_id)
);

-- ---------------------------------------------------------------------------
-- Indexes for the common lookups
-- ---------------------------------------------------------------------------
create index if not exists idx_rooms_admin_code   on public.rooms (admin_code);
create index if not exists idx_rooms_view_code    on public.rooms (view_code);
create index if not exists idx_players_room        on public.players (room_id);
create index if not exists idx_games_room          on public.games (room_id, played_at desc);
create index if not exists idx_game_entries_game   on public.game_entries (game_id);
create index if not exists idx_game_entries_player on public.game_entries (player_id);
create index if not exists idx_payments_room       on public.payments (room_id, paid_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: enable everywhere, add NO public policies.
-- This denies the anon/public key all access; the server-side service role
-- key (used only in Next.js route handlers) bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.rooms        enable row level security;
alter table public.players      enable row level security;
alter table public.games        enable row level security;
alter table public.game_entries enable row level security;
alter table public.payments     enable row level security;

-- ---------------------------------------------------------------------------
-- create_game: atomically insert a game and all of its entries. A function
-- body runs in a single transaction, so a failure rolls back the whole game
-- (no orphaned game rows that would corrupt balances). Verification of the
-- buy-in/cash-out totals happens in the app before this is called; this
-- function only persists the already-validated result.
--
-- p_entries is a JSON array of { player_id, buy_ins: number[], cash_out }.
-- ---------------------------------------------------------------------------
create or replace function public.create_game(
  p_room_id        uuid,
  p_played_at      timestamptz,
  p_location       text,
  p_notes          text,
  p_total_buy_in   integer,
  p_total_cash_out integer,
  p_discrepancy    integer,
  p_entries        jsonb
) returns uuid
language plpgsql
as $$
declare
  v_game_id uuid;
  v_entry   jsonb;
begin
  insert into public.games (
    room_id, played_at, location, notes,
    total_buy_in, total_cash_out, discrepancy
  )
  values (
    p_room_id, p_played_at, p_location, p_notes,
    p_total_buy_in, p_total_cash_out, p_discrepancy
  )
  returning id into v_game_id;

  for v_entry in select * from jsonb_array_elements(p_entries)
  loop
    insert into public.game_entries (game_id, player_id, buy_ins, cash_out)
    values (
      v_game_id,
      (v_entry ->> 'player_id')::uuid,
      coalesce(
        (select array_agg((x)::integer)
           from jsonb_array_elements_text(v_entry -> 'buy_ins') as t(x)),
        '{}'::integer[]
      ),
      (v_entry ->> 'cash_out')::integer
    );
  end loop;

  return v_game_id;
end;
$$;
