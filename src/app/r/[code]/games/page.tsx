import Link from "next/link";
import { loadRoom } from "@/lib/room-access";
import { getRoomState } from "@/lib/db/room-state";
import { Card, EmptyState, Money, netColor } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteGameAction } from "../actions";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function GamesPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { room, mode } = await loadRoom(code);
  const isAdmin = mode === "admin";
  const state = await getRoomState(room);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
          Games
        </h1>
        {isAdmin ? (
          <Link
            href={`/r/${code}/games/new`}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Log a game
          </Link>
        ) : null}
      </div>

      {state.games.length === 0 ? (
        <EmptyState
          title="No games yet"
          hint={
            isAdmin
              ? "Log your first night to start tracking who owes whom."
              : "Nothing has been recorded yet."
          }
        />
      ) : (
        state.games.map((g) => (
          <Card key={g.id} className="p-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-zinc-900">
                  {formatDate(g.playedAt)}
                </div>
                {g.location ? (
                  <div className="text-xs text-zinc-500">{g.location}</div>
                ) : null}
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500">Pot</div>
                <Money
                  amount={g.totalBuyIn}
                  currencyCode={room.currencyCode}
                  className="font-semibold text-zinc-900"
                />
              </div>
            </div>

            {g.discrepancy !== 0 ? (
              <div className="mb-2 inline-flex rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                Chip count off by{" "}
                <Money
                  amount={Math.abs(g.discrepancy)}
                  currencyCode={room.currencyCode}
                  className="mx-1"
                />
                (within tolerance)
              </div>
            ) : null}

            <ul className="divide-y divide-zinc-100">
              {g.entries.map((e) => (
                <li
                  key={e.playerId}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-zinc-800">{e.playerName}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">
                      in{" "}
                      <Money
                        amount={e.totalBuyIn}
                        currencyCode={room.currencyCode}
                      />{" "}
                      · out{" "}
                      <Money
                        amount={e.cashOut}
                        currencyCode={room.currencyCode}
                      />
                    </span>
                    <span
                      className={`w-20 text-right font-semibold ${netColor(e.net)}`}
                    >
                      <Money
                        amount={e.net}
                        currencyCode={room.currencyCode}
                        signed
                      />
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {g.notes ? (
              <p className="mt-2 text-xs text-zinc-500">{g.notes}</p>
            ) : null}

            {isAdmin ? (
              <form action={deleteGameAction} className="mt-3 text-right">
                <input type="hidden" name="code" value={code} />
                <input type="hidden" name="gameId" value={g.id} />
                <ConfirmButton
                  message="Delete this game? Balances will be recalculated."
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Delete game
                </ConfirmButton>
              </form>
            ) : null}
          </Card>
        ))
      )}
    </div>
  );
}
