import "server-only";
import { getServiceClient } from "@/lib/supabase/server";
import type { PaymentRow, PaymentView } from "./types";

export interface CreatePaymentInput {
  roomId: string;
  fromPlayerId: string;
  toPlayerId: string;
  amount: number;
  paidAt?: string;
  note?: string | null;
}

export async function createPayment(input: CreatePaymentInput): Promise<void> {
  if (input.fromPlayerId === input.toPlayerId) {
    throw new Error("A payment must be between two different players.");
  }
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("Payment amount must be a positive whole number.");
  }

  const supabase = getServiceClient();
  const { error } = await supabase.from("payments").insert({
    room_id: input.roomId,
    from_player_id: input.fromPlayerId,
    to_player_id: input.toPlayerId,
    amount: input.amount,
    paid_at: input.paidAt ?? new Date().toISOString(),
    note: input.note ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function listPayments(
  roomId: string,
  nameById: Map<string, string>
): Promise<PaymentView[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("room_id", roomId)
    .order("paid_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data as PaymentRow[]).map((p) => ({
    id: p.id,
    fromPlayerId: p.from_player_id,
    toPlayerId: p.to_player_id,
    fromName: nameById.get(p.from_player_id) ?? "(unknown)",
    toName: nameById.get(p.to_player_id) ?? "(unknown)",
    amount: p.amount,
    paidAt: p.paid_at,
    note: p.note,
  }));
}

export async function deletePayment(paymentId: string): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId);
  if (error) throw new Error(error.message);
}
