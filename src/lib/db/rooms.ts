import "server-only";
import { getServiceClient } from "@/lib/supabase/server";
import { generateCode } from "@/lib/codes";
import { getCurrency } from "@/lib/currency";
import type { Room, RoomMode, RoomRow } from "./types";

function toRoom(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    currencyCode: row.currency_code,
    tolerance: row.tolerance,
    adminCode: row.admin_code,
    viewCode: row.view_code,
    createdAt: row.created_at,
  };
}

export interface CreateRoomInput {
  name: string;
  currencyCode: string;
  tolerance?: number;
}

export async function createRoom(input: CreateRoomInput): Promise<Room> {
  const supabase = getServiceClient();
  const currency = getCurrency(input.currencyCode);
  const tolerance =
    input.tolerance !== undefined ? input.tolerance : currency.defaultTolerance;

  // Retry on the (extremely unlikely) code collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        name: input.name,
        currency_code: currency.code,
        tolerance,
        admin_code: generateCode(),
        view_code: generateCode(),
      })
      .select("*")
      .single();

    if (!error && data) return toRoom(data as RoomRow);
    if (error && error.code !== "23505") {
      throw new Error(`Failed to create room: ${error.message}`);
    }
    // 23505 = unique violation -> regenerate codes and retry.
  }
  throw new Error("Failed to create room after several attempts.");
}

export async function getRoomByCode(
  code: string
): Promise<{ room: Room; mode: RoomMode } | null> {
  const supabase = getServiceClient();

  const admin = await supabase
    .from("rooms")
    .select("*")
    .eq("admin_code", code)
    .maybeSingle();
  if (admin.error) throw new Error(admin.error.message);
  if (admin.data) return { room: toRoom(admin.data as RoomRow), mode: "admin" };

  const view = await supabase
    .from("rooms")
    .select("*")
    .eq("view_code", code)
    .maybeSingle();
  if (view.error) throw new Error(view.error.message);
  if (view.data) return { room: toRoom(view.data as RoomRow), mode: "view" };

  return null;
}

export interface UpdateRoomInput {
  name?: string;
  currencyCode?: string;
  tolerance?: number;
}

export async function updateRoom(
  roomId: string,
  input: UpdateRoomInput
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.currencyCode !== undefined) patch.currency_code = input.currencyCode;
  if (input.tolerance !== undefined) patch.tolerance = input.tolerance;
  if (Object.keys(patch).length === 0) return;

  const supabase = getServiceClient();
  const { error } = await supabase.from("rooms").update(patch).eq("id", roomId);
  if (error) throw new Error(error.message);
}
