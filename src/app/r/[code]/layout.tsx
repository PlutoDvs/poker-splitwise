import Link from "next/link";
import { loadRoom } from "@/lib/room-access";
import { RoomNav } from "@/components/RoomNav";
import { RememberRoom } from "@/components/RememberRoom";
import { RoomSwitcher } from "@/components/RoomSwitcher";

export default async function RoomLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { room, mode } = await loadRoom(code);
  const isAdmin = mode === "admin";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5">
      <RememberRoom id={room.id} code={code} name={room.name} mode={mode} />
      <header className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link
              href={`/r/${code}`}
              className="text-xl font-bold tracking-tight text-zinc-900"
            >
              {room.name}
            </Link>
            <p className="text-xs text-zinc-500">
              {isAdmin ? "Admin access · you can edit" : "View only"}
            </p>
          </div>
          <RoomSwitcher currentCode={code} currentId={room.id} />
        </div>
        <div className="mt-4">
          <RoomNav code={code} isAdmin={isAdmin} />
        </div>
      </header>
      {children}
    </div>
  );
}
