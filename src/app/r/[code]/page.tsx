import Link from "next/link";
import { headers } from "next/headers";
import { loadRoom } from "@/lib/room-access";
import { getRoomState } from "@/lib/db/room-state";
import { Card, EmptyState, Money, netColor } from "@/components/ui";
import { CopyButton } from "@/components/CopyButton";

export default async function Dashboard({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { room, mode } = await loadRoom(code);
  const isAdmin = mode === "admin";
  const state = await getRoomState(room);

  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "";
  const viewLink = `${origin}/r/${room.viewCode}`;
  const adminLink = `${origin}/r/${room.adminCode}`;

  const totalPot = state.games.reduce((sum, g) => sum + g.totalBuyIn, 0);
  const balanceRows = [...state.stats].sort((a, b) => b.balance - a.balance);

  return (
    <div className="flex flex-col gap-5">
      {/* Summary numbers */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Games" value={String(state.games.length)} />
        <Stat label="Players" value={String(state.players.length)} />
        <Stat
          label="Total pot"
          value={<Money amount={totalPot} currencyCode={room.currencyCode} />}
        />
      </div>

      {/* Settle up */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">
            Who pays whom
          </h2>
          {isAdmin && state.transfers.length > 0 ? (
            <Link
              href={`/r/${code}/settle`}
              className="text-sm font-medium text-emerald-400 hover:underline"
            >
              Record a payment →
            </Link>
          ) : null}
        </div>
        {state.transfers.length === 0 ? (
          <EmptyState
            title="All settled up 🎉"
            hint="No outstanding debts in this group."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {state.transfers.map((t, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3"
              >
                <span className="text-sm text-zinc-700">
                  <span className="font-medium text-zinc-900">{t.fromName}</span>{" "}
                  pays{" "}
                  <span className="font-medium text-zinc-900">{t.toName}</span>
                </span>
                <Money
                  amount={t.amount}
                  currencyCode={room.currencyCode}
                  className="font-semibold text-zinc-900"
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Balances */}
      <Card className="p-5">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">Balances</h2>
        {balanceRows.length === 0 ? (
          <EmptyState
            title="No players yet"
            hint={isAdmin ? "Add players, then log your first game." : undefined}
          />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {balanceRows.map((p) => (
              <li
                key={p.playerId}
                className="flex items-center justify-between py-2.5"
              >
                <span className="text-sm text-zinc-800">{p.name}</span>
                <span className={`text-sm font-semibold ${netColor(p.balance)}`}>
                  {p.balance === 0 ? (
                    <span className="text-zinc-400">settled</span>
                  ) : p.balance > 0 ? (
                    <>
                      is owed{" "}
                      <Money
                        amount={p.balance}
                        currencyCode={room.currencyCode}
                      />
                    </>
                  ) : (
                    <>
                      owes{" "}
                      <Money
                        amount={-p.balance}
                        currencyCode={room.currencyCode}
                      />
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Share / links */}
      {isAdmin ? (
        <Card className="p-5">
          <h2 className="mb-1 text-base font-semibold text-zinc-900">
            Share this group
          </h2>
          <p className="mb-3 text-sm text-zinc-500">
            Send the view link to friends. Keep the admin link to yourself.
          </p>
          <div className="flex flex-col gap-3">
            <LinkRow label="View link (read-only)" value={viewLink} />
            <LinkRow label="Admin link (private)" value={adminLink} danger />
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-100 p-3 text-center shadow-sm">
      <div className="text-base font-semibold text-zinc-900">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

function LinkRow({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div>
      <div
        className={`mb-1 text-xs font-medium ${
          danger ? "text-red-400" : "text-zinc-500"
        }`}
      >
        {label}
      </div>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={value}
          className="min-w-0 flex-1 truncate rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600"
        />
        <CopyButton value={value} />
      </div>
    </div>
  );
}
