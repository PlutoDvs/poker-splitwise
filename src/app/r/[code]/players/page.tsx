import { redirect } from "next/navigation";
import { loadRoom } from "@/lib/room-access";
import { listPlayers } from "@/lib/db/players";
import { Card, EmptyState } from "@/components/ui";
import { AddPlayerForm } from "@/components/AddPlayerForm";
import { renamePlayerAction, togglePlayerActiveAction } from "../actions";

export default async function PlayersPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { room, mode } = await loadRoom(code);
  if (mode !== "admin") redirect(`/r/${code}`);

  const players = await listPlayers(room.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
        Players
      </h1>

      <Card className="p-4">
        <AddPlayerForm code={code} />
      </Card>

      {players.length === 0 ? (
        <EmptyState title="No players yet" hint="Add everyone in the group." />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-2 p-3"
            >
              <form
                action={renamePlayerAction}
                className="flex flex-1 items-center gap-2"
              >
                <input type="hidden" name="code" value={code} />
                <input type="hidden" name="playerId" value={p.id} />
                <input
                  name="name"
                  defaultValue={p.name}
                  className={`min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm hover:border-zinc-200 focus:border-emerald-500 focus:bg-white focus:outline-none ${
                    p.isActive ? "text-zinc-900" : "text-zinc-400"
                  }`}
                />
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  Save
                </button>
              </form>
              <form action={togglePlayerActiveAction}>
                <input type="hidden" name="code" value={code} />
                <input type="hidden" name="playerId" value={p.id} />
                <input
                  type="hidden"
                  name="isActive"
                  value={p.isActive ? "false" : "true"}
                />
                <button
                  type="submit"
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                    p.isActive
                      ? "text-zinc-500 hover:bg-zinc-50"
                      : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  {p.isActive ? "Deactivate" : "Reactivate"}
                </button>
              </form>
            </div>
          ))}
        </Card>
      )}
      <p className="text-xs text-zinc-400">
        Deactivated players stay in past games and balances but won&apos;t show
        up when logging a new game.
      </p>
    </div>
  );
}
