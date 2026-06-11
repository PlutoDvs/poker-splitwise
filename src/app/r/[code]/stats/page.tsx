import { loadRoom } from "@/lib/room-access";
import { getRoomState } from "@/lib/db/room-state";
import { Card, EmptyState, Money, netColor } from "@/components/ui";

export default async function StatsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: _code } = await params;
  const { room } = await loadRoom(_code);
  const state = await getRoomState(room);
  const ranked = state.stats.filter((s) => s.gamesPlayed > 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
        Stats & leaderboard
      </h1>

      {ranked.length === 0 ? (
        <EmptyState
          title="No games played yet"
          hint="Stats appear once games are logged."
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
                <th className="px-4 py-2.5 font-medium">Player</th>
                <th className="px-2 py-2.5 text-center font-medium">Games</th>
                <th className="px-2 py-2.5 text-right font-medium">
                  Best night
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((s, i) => (
                <tr
                  key={s.playerId}
                  className="border-b border-zinc-50 last:border-0"
                >
                  <td className="px-4 py-2.5">
                    <span className="text-zinc-400">{i + 1}.</span>{" "}
                    <span className="font-medium text-zinc-900">{s.name}</span>
                    {!s.isActive ? (
                      <span className="ml-1 text-xs text-zinc-400">
                        (inactive)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2.5 text-center text-zinc-600">
                    {s.gamesPlayed}
                  </td>
                  <td className="px-2 py-2.5 text-right text-emerald-400">
                    {s.biggestWin > 0 ? (
                      <Money
                        amount={s.biggestWin}
                        currencyCode={room.currencyCode}
                      />
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-semibold ${netColor(
                      s.totalNet
                    )}`}
                  >
                    <Money
                      amount={s.totalNet}
                      currencyCode={room.currencyCode}
                      signed
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="text-xs text-zinc-400">
        Net is total winnings/losses across all games. Current balance (after
        payments) is on the dashboard.
      </p>
    </div>
  );
}
