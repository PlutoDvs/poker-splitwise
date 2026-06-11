"use client";
import { useActionState, useEffect, useRef } from "react";
import { addPlayerAction, type FormState } from "@/app/r/[code]/actions";
import { SubmitButton } from "./SubmitButton";

export function AddPlayerForm({ code }: { code: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    addPlayerAction,
    {}
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="hidden"
          name="code"
          value={code}
          readOnly
        />
        <input
          name="name"
          placeholder="New player name"
          autoComplete="off"
          className="flex-1 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <SubmitButton pendingText="Adding…">Add</SubmitButton>
      </div>
      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}
