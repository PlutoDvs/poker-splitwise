import { redirect } from "next/navigation";
import { loadRoom } from "@/lib/room-access";
import { getRoomState } from "@/lib/db/room-state";
import { Card, EmptyState, Money } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SettlePanel } from "@/components/SettlePanel";
import { deletePaymentAction } from "../actions";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function SettlePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { room, mode } = await loadRoom(code);
  if (mode !== "admin") redirect(`/r/${code}`);

  const state = await getRoomState(room);
  const players = state.players
    .filter((p) => p.isActive)
    .map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
        Settle up
      </h1>

      <SettlePanel
        code={code}
        currencyCode={room.currencyCode}
        players={players}
        suggestions={state.transfers}
      />

      <div>
        <h2 className="mb-2 mt-2 text-sm font-semibold text-zinc-900">
          Payment history
        </h2>
        {state.payments.length === 0 ? (
          <EmptyState title="No payments recorded yet" />
        ) : (
          <Card className="divide-y divide-zinc-100">
            {state.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="text-sm">
                  <div className="text-zinc-800">
                    <span className="font-medium">{p.fromName}</span> →{" "}
                    <span className="font-medium">{p.toName}</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {formatDate(p.paidAt)}
                    {p.note ? ` · ${p.note}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Money
                    amount={p.amount}
                    currencyCode={room.currencyCode}
                    className="font-semibold text-zinc-900"
                  />
                  <form action={deletePaymentAction}>
                    <input type="hidden" name="code" value={code} />
                    <input type="hidden" name="paymentId" value={p.id} />
                    <ConfirmButton
                      message="Delete this payment?"
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
