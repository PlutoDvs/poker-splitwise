import "server-only";
import { getServiceClient } from "@/lib/supabase/server";
import type { Player, PlayerRow } from "./types";

function toPlayer(row: PlayerRow): Player {
  return { id: row.id, name: row.name, isActive: row.is_active };
}

export async function listPlayers(roomId: string): Promise<Player[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as PlayerRow[]).map(toPlayer);
}

export async function addPlayer(roomId: string, name: string): Promise<Player> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Player name cannot be empty.");

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("players")
    .insert({ room_id: roomId, name: trimmed })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error(`A player named "${trimmed}" already exists in this room.`);
    }
    throw new Error(error.message);
  }
  return toPlayer(data as PlayerRow);
}

export async function setPlayerActive(
  playerId: string,
  isActive: boolean
): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("players")
    .update({ is_active: isActive })
    .eq("id", playerId);
  if (error) throw new Error(error.message);
}

export async function renamePlayer(
  playerId: string,
  name: string
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Player name cannot be empty.");

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("players")
    .update({ name: trimmed })
    .eq("id", playerId);
  if (error) {
    if (error.code === "23505") {
      throw new Error(`A player named "${trimmed}" already exists in this room.`);
    }
    throw new Error(error.message);
  }
}
