# Poker Ledger

A Splitwise-style web app for **poker debts**. Log each night's buy-ins and
cash-outs, verify the chips actually balance (you count them by hand), and the
app accumulates everyone's running balance and tells you the **fewest payments**
needed to settle up. Works on phone and PC, installable as a PWA, and deploys
for **free**.

## How it works

- **Groups (rooms)** — one per friend group. No accounts: each room has a
  private **admin link** (you, full edit) and a **view link** (read-only, share
  it). Anyone with a link has that access.
- **Players** — just names within a room.
- **Games** — pick who played, enter each player's buy-in(s) (re-buys
  supported) and final cash-out. The app checks that total buy-ins ≈ total
  cash-outs:
  - **Exactly equal** → saved as balanced.
  - **Off by ≤ the room's tolerance** (default 5,000 Toman / $2, editable) →
    saved and flagged.
  - **Off by more** → blocked, with the exact gap shown so you recount.
- **Settle up** — record real payments between players; balances draw down over
  time. The dashboard always shows the simplified "who pays whom".
- **Stats** — net profit/loss leaderboard, games played, best night.

All money is stored as integer minor units (whole Toman, or cents) so the
settlement math never drifts.

## Tech

- **Next.js 16** (App Router, server components + server actions) + **React 19**
- **Tailwind CSS v4**
- **Supabase** (Postgres) — accessed only server-side via the service-role key
- Deploys on **Vercel**

The settlement core (`src/lib/poker/`) is pure, framework-free TypeScript with
**101 unit tests** (`npm test`), including fuzz-tested debt simplification.

---

## Run locally

### 1. Create a Supabase project (free)

1. Sign up at [supabase.com](https://supabase.com) and create a new project
   (the free tier is plenty). Pick a database password and region.
2. When it's ready, open the **SQL Editor**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
   tables, the atomic `create_game` function, indexes, and locks down access
   with row-level security.
3. Go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** secret key → `SUPABASE_SERVICE_ROLE_KEY`
     (this is a secret — it's only ever used on the server, never sent to the
     browser).

### 2. Configure and run

```bash
cp .env.example .env.local      # then paste your two values into .env.local
npm install
npm run dev
```

Open http://localhost:3000, create a group, and you're off.

> **Windows note:** if `npm run dev`/`build` ever complains that a `.node`
> binary "is not a valid Win32 application", a dependency's native binary
> download was truncated. Fix with a clean reinstall:
> `rm -r node_modules; npm cache clean --force; npm install`.

---

## Deploy free on Vercel

1. Push this project to a GitHub repo.
2. At [vercel.com](https://vercel.com), **Add New → Project** and import the
   repo. Framework is auto-detected as Next.js.
3. Under **Environment Variables**, add the same two as in `.env.local`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. **Deploy.** You get a free `https://your-app.vercel.app` URL that works on
   any phone or computer.

### Install on a phone

Open the site in the browser and choose **Add to Home Screen**. It launches
full-screen like a native app (PWA).

---

## Free-tier notes

- **Supabase free projects pause after ~7 days of inactivity** — one click in
  the dashboard wakes it. For a regular poker group this rarely triggers. If it
  bugs you, the same code works on any Postgres (e.g. Neon) by changing the env
  vars, or swap to Cloudflare D1 with small data-layer edits.
- **Vercel Hobby** is free for personal projects.

## Security model

There are no user accounts; **knowing a room's link grants access** to that
room. Keep the **admin link private** (it can edit/delete); share only the
**view link**. The browser never talks to Supabase directly — every read/write
goes through server code that validates the code first, and RLS denies all
direct (anon-key) access.

## Project layout

```
src/lib/poker/      Pure settlement logic (verify, balances, simplify) + tests
src/lib/db/         Typed Supabase data layer (rooms, players, games, payments)
src/lib/currency.ts Currency config + integer-minor-unit money formatting
src/app/            Routes: landing + /r/[code] (dashboard, games, settle, …)
src/components/     UI + client components (GameForm, SettlePanel, …)
supabase/schema.sql Database schema — run once in Supabase
```
