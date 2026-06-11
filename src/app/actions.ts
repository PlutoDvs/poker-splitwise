"use server";
import { redirect } from "next/navigation";
import { createRoom, getRoomByCode } from "@/lib/db/rooms";

export interface ActionState {
  error?: string;
}

export async function createRoomAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const currencyCode = String(formData.get("currencyCode") ?? "");
  if (!name) return { error: "Please give the room a name." };

  const room = await createRoom({ name, currencyCode });
  redirect(`/r/${room.adminCode}`);
}

export async function gotoRoomAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = String(formData.get("code") ?? "").trim();
  if (!raw) return { error: "Paste a room link or code." };

  // Accept either a bare code or a full shared link.
  const code = raw.includes("/r/")
    ? (raw.split("/r/").pop() ?? "").split(/[/?#]/)[0]
    : raw;

  const result = await getRoomByCode(code);
  if (!result) return { error: "No room matches that link or code." };
  redirect(`/r/${code}`);
}
