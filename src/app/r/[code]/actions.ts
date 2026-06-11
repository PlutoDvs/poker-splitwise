"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/room-access";
import { addPlayer, renamePlayer, setPlayerActive } from "@/lib/db/players";
import { createGame, deleteGame, type NewGameEntry } from "@/lib/db/games";
import { createPayment, deletePayment } from "@/lib/db/payments";
import { updateRoom } from "@/lib/db/rooms";
import { getCurrency, parseMoney } from "@/lib/currency";

function revalidateRoom(code: string): void {
  revalidatePath(`/r/${code}`, "layout");
}

export interface FormState {
  error?: string;
  ok?: boolean;
}

// --- Games ---

export interface AddGamePayload {
  playedAt: string; // ISO
  location: string | null;
  notes: string | null;
  entries: NewGameEntry[]; // amounts already in integer minor units
}

export async function addGameAction(
  code: string,
  payload: AddGamePayload
): Promise<{ ok: boolean; errors?: string[] }> {
  const room = await requireAdmin(code);
  const result = await createGame({
    roomId: room.id,
    playedAt: payload.playedAt,
    location: payload.location,
    notes: payload.notes,
    tolerance: room.tolerance,
    entries: payload.entries,
  });

  if (!result.ok) {
    const errors = result.verify.errors.length
      ? result.verify.errors
      : ["Buy-ins and cash-outs differ by more than the room's tolerance."];
    return { ok: false, errors };
  }

  revalidateRoom(code);
  return { ok: true };
}

export async function deleteGameAction(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "");
  const gameId = String(formData.get("gameId") ?? "");
  await requireAdmin(code);
  await deleteGame(gameId);
  revalidateRoom(code);
}

// --- Players ---

export async function addPlayerAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const code = String(formData.get("code") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const room = await requireAdmin(code);
  if (!name) return { error: "Enter a player name." };
  try {
    await addPlayer(room.id, name);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not add player." };
  }
  revalidateRoom(code);
  return { ok: true };
}

export async function renamePlayerAction(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  await requireAdmin(code);
  if (name) await renamePlayer(playerId, name);
  revalidateRoom(code);
}

export async function togglePlayerActiveAction(
  formData: FormData
): Promise<void> {
  const code = String(formData.get("code") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";
  await requireAdmin(code);
  await setPlayerActive(playerId, isActive);
  revalidateRoom(code);
}

// --- Payments ---

export async function addPaymentAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const code = String(formData.get("code") ?? "");
  const fromPlayerId = String(formData.get("fromPlayerId") ?? "");
  const toPlayerId = String(formData.get("toPlayerId") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const room = await requireAdmin(code);
  if (!fromPlayerId || !toPlayerId) {
    return { error: "Choose who paid and who received." };
  }
  if (fromPlayerId === toPlayerId) {
    return { error: "Payer and receiver must be different players." };
  }
  const amount = parseMoney(amountRaw, getCurrency(room.currencyCode));
  if (amount === null || amount <= 0) {
    return { error: "Enter a valid payment amount." };
  }

  try {
    await createPayment({
      roomId: room.id,
      fromPlayerId,
      toPlayerId,
      amount,
      note: note || null,
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not record payment.",
    };
  }
  revalidateRoom(code);
  return { ok: true };
}

export async function deletePaymentAction(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "");
  const paymentId = String(formData.get("paymentId") ?? "");
  await requireAdmin(code);
  await deletePayment(paymentId);
  revalidateRoom(code);
}

// --- Settings ---

export async function updateRoomAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const code = String(formData.get("code") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const currencyCode = String(formData.get("currencyCode") ?? "");
  const toleranceRaw = String(formData.get("tolerance") ?? "");

  const room = await requireAdmin(code);
  if (!name) return { error: "Room name cannot be empty." };

  const currency = getCurrency(currencyCode);
  const tolerance = parseMoney(toleranceRaw, currency);
  if (tolerance === null) {
    return { error: "Enter a valid tolerance amount (0 or more)." };
  }

  await updateRoom(room.id, {
    name,
    currencyCode: currency.code,
    tolerance,
  });
  revalidateRoom(code);
  return { ok: true };
}
