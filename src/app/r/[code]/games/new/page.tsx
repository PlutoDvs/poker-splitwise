import { redirect } from "next/navigation";
import { loadRoom } from "@/lib/room-access";
import { listPlayers } from "@/lib/db/players";
import { GameForm } from "@/components/GameForm";

export default async function NewGamePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { room, mode } = await loadRoom(code);
  if (mode !== "admin") redirect(`/r/${code}/games`);

  const players = (await listPlayers(room.id))
    .filter((p) => p.isActive)
    .map((p) => ({ id: p.id, name: p.name }));

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold tracking-tight text-zinc-900">
        Log a game
      </h1>
      <GameForm
        code={code}
        currencyCode={room.currencyCode}
        tolerance={room.tolerance}
        players={players}
      />
    </div>
  );
}
