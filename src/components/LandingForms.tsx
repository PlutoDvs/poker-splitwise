"use client";
import { useActionState } from "react";
import {
  createRoomAction,
  gotoRoomAction,
  type ActionState,
} from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

const inputClass =
  "w-full rounded-xl border border-zinc-300 bg-zinc-100 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export function LandingForms({
  currencies,
  defaultCurrency,
}: {
  currencies: { code: string; label: string }[];
  defaultCurrency: string;
}) {
  const [createState, createAction] = useActionState<ActionState, FormData>(
    createRoomAction,
    {}
  );
  const [openState, openAction] = useActionState<ActionState, FormData>(
    gotoRoomAction,
    {}
  );

  return (
    <div className="flex flex-col gap-5">
      <form
        action={createAction}
        className="rounded-2xl border border-zinc-200 bg-zinc-100 p-5 shadow-sm"
      >
        <h2 className="text-base font-semibold text-zinc-900">
          Create a new group
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          One room per friend group. You&apos;ll get an admin link to manage it
          and a view link to share.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <input
            name="name"
            placeholder="Group name (e.g. Friday Night Poker)"
            className={inputClass}
            autoComplete="off"
            required
          />
          <select
            name="currencyCode"
            defaultValue={defaultCurrency}
            className={inputClass}
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          {createState.error ? (
            <p className="text-sm text-red-400">{createState.error}</p>
          ) : null}
          <SubmitButton pendingText="Creating…">Create group</SubmitButton>
        </div>
      </form>

      <form
        action={openAction}
        className="rounded-2xl border border-zinc-200 bg-zinc-100 p-5 shadow-sm"
      >
        <h2 className="text-base font-semibold text-zinc-900">
          Open an existing group
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Paste the link someone shared, or the code from it.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <input
            name="code"
            placeholder="Room link or code"
            className={inputClass}
            autoComplete="off"
            required
          />
          {openState.error ? (
            <p className="text-sm text-red-400">{openState.error}</p>
          ) : null}
          <SubmitButton variant="ghost" pendingText="Opening…">
            Open group
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
