"use client";
import { useActionState } from "react";
import { updateRoomAction, type FormState } from "@/app/r/[code]/actions";
import { SubmitButton } from "./SubmitButton";

const fieldClass =
  "w-full rounded-xl border border-zinc-300 bg-zinc-100 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export function SettingsForm({
  code,
  name,
  currencyCode,
  toleranceDisplay,
  currencies,
}: {
  code: string;
  name: string;
  currencyCode: string;
  toleranceDisplay: string;
  currencies: { code: string; label: string }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    updateRoomAction,
    {}
  );

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-100 p-4 shadow-sm"
    >
      <input type="hidden" name="code" value={code} />
      <label className="text-sm">
        <span className="mb-1 block text-zinc-600">Group name</span>
        <input name="name" defaultValue={name} className={fieldClass} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-zinc-600">Currency</span>
        <select
          name="currencyCode"
          defaultValue={currencyCode}
          className={fieldClass}
        >
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-zinc-600">
          Chip-count tolerance
        </span>
        <input
          name="tolerance"
          inputMode="decimal"
          defaultValue={toleranceDisplay}
          className={fieldClass}
        />
        <span className="mt-1 block text-xs text-zinc-400">
          Games are accepted when buy-ins and cash-outs differ by no more than
          this. Larger gaps are blocked.
        </span>
      </label>

      {state.error ? (
        <p className="text-sm text-red-400">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-emerald-400">Saved.</p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
      </div>
    </form>
  );
}
