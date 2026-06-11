import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getRoomByCode } from "@/lib/db/rooms";
import type { Room, RoomMode } from "@/lib/db/types";

/**
 * Resolve a room from a URL code (admin or view). Cached per request so the
 * layout and the page that both call it share a single query.
 * Calls notFound() when the code matches no room.
 */
export const loadRoom = cache(
  async (code: string): Promise<{ room: Room; mode: RoomMode }> => {
    const result = await getRoomByCode(code);
    if (!result) notFound();
    return result;
  }
);

/** Resolve a room and require admin access; throws otherwise. For server actions. */
export async function requireAdmin(code: string): Promise<Room> {
  const { room, mode } = await loadRoom(code);
  if (mode !== "admin") {
    throw new Error("This action requires the room's admin link.");
  }
  return room;
}
