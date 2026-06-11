"use client";
import { useActionState, useEffect, useState } from "react";
import { addPaymentAction, type FormState } from "@/app/r/[code]/actions";
import { getCurrency, formatMoney } from "@/lib/currency";
import { SubmitButton } from "./SubmitButton";

interface PlayerOption {
  id: string;
  name: string;
}

interface Suggestion {
  fromPlayerId: string;
  toPlayerId: string;
  fromName: string;
  toName: string;
  amount: number;
}

const fieldClass =
  "w-full rounded-xl border border-zinc-300 bg-zinc-100 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export function SettlePanel({
  code,
  currencyCode,
  players,
  suggestions,
}: {
  code: string;
  currencyCode: string;
  players: PlayerOption[];
  suggestions: Suggestion[];
}) {
  const currency = getCurrency(currencyCode);
  const [state, action] = useActionState<FormState, FormData>(
    addPaymentAction,
    {}
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (state.ok) {
      setFrom("");
      setTo("");
      setAmount("");
      setNote("");
    }
  }, [state]);

  function prefill(s: Suggestion) {
    setFrom(s.fromPlayerId);
    setTo(s.toPlayerId);
    setAmount(formatMoney(s.amount, currency, { withSymbol: false }));
  }

  return (
    <div className="flex flex-col gap-4">
      {suggestions.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-100 p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">
            Suggested payments
          </h2>
          <ul className="flex flex-col gap-2">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => prefill(s)}
                  className="flex w-full items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 text-left hover:bg-emerald-500/10"
                >
                  <span className="text-sm text-zinc-700">
                    <span className="font-medium text-zinc-900">
                      {s.fromName}
                    </span>{" "}
                    pays{" "}
                    <span className="font-medium text-zinc-900">
                      {s.toName}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-zinc-900">
                    {formatMoney(s.amount, currency)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-zinc-400">
            Tap one to fill in the form, then record it once it&apos;s paid.
          </p>
        </div>
      ) : null}

      <form
        action={action}
        className="rounded-2xl border border-zinc-200 bg-zinc-100 p-4 shadow-sm"
      >
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">
          Record a payment
        </h2>
        <input type="hidden" name="code" value={code} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-600">Who paid</span>
            <select
              name="fromPlayerId"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={fieldClass}
            >
              <option value="">Select…</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-600">Who received</span>
            <select
              name="toPlayerId"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={fieldClass}
            >
              <option value="">Select…</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-600">Amount</span>
            <input
              name="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={fieldClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-600">Note (optional)</span>
            <input
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. cash, transfer"
              className={fieldClass}
            />
          </label>
        </div>
        {state.error ? (
          <p className="mt-3 text-sm text-red-400">{state.error}</p>
        ) : null}
        <div className="mt-4 flex justify-end">
          <SubmitButton pendingText="Saving…">Record payment</SubmitButton>
        </div>
      </form>
    </div>
  );
}
