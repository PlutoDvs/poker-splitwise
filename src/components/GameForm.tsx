"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getCurrency, formatMoney, parseMoney } from "@/lib/currency";
import { addGameAction } from "@/app/r/[code]/actions";

interface PlayerOption {
  id: string;
  name: string;
}

interface Row {
  included: boolean;
  buyIns: string[];
  cashOut: string;
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export function GameForm({
  code,
  currencyCode,
  tolerance,
  players,
}: {
  code: string;
  currencyCode: string;
  tolerance: number;
  players: PlayerOption[];
}) {
  const currency = getCurrency(currencyCode);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const [playedAt, setPlayedAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(
      players.map((p) => [p.id, { included: false, buyIns: [""], cashOut: "" }])
    )
  );

  const parse = (s: string) => parseMoney(s, currency);

  function update(id: string, patch: Partial<Row>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  const included = players.filter((p) => rows[p.id]?.included);

  const { totalBuyIn, totalCashOut } = useMemo(() => {
    let buy = 0;
    let cash = 0;
    for (const p of included) {
      const r = rows[p.id];
      for (const b of r.buyIns) {
        const v = parse(b);
        if (v && v > 0) buy += v;
      }
      const c = parse(r.cashOut);
      if (c && c > 0) cash += c;
    }
    return { totalBuyIn: buy, totalCashOut: cash };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, included.length, currencyCode]);

  const discrepancy = totalCashOut - totalBuyIn;
  const withinTolerance = Math.abs(discrepancy) <= tolerance;

  const allComplete =
    included.length >= 2 &&
    included.every((p) => {
      const r = rows[p.id];
      const hasBuyIn = r.buyIns.some((b) => {
        const v = parse(b);
        return v !== null && v > 0;
      });
      const cashOk = parse(r.cashOut) !== null;
      return hasBuyIn && cashOk;
    });

  const canSubmit = allComplete && withinTolerance && !isPending;

  function submit() {
    setServerErrors([]);
    const entries = included.map((p) => {
      const r = rows[p.id];
      const buyIns = r.buyIns
        .map(parse)
        .filter((v): v is number => v !== null && v > 0);
      const cashOut = parse(r.cashOut) ?? 0;
      return { playerId: p.id, buyIns, cashOut };
    });

    const iso = (() => {
      const d = new Date(`${playedAt}T12:00:00`);
      return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    })();

    startTransition(async () => {
      const res = await addGameAction(code, {
        playedAt: iso,
        location: location.trim() || null,
        notes: notes.trim() || null,
        entries,
      });
      if (res.ok) {
        router.push(`/r/${code}/games`);
        router.refresh();
      } else {
        setServerErrors(res.errors ?? ["Could not save the game."]);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Meta */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-100 p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-600">Date</span>
            <input
              type="date"
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-600">Location (optional)</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Sam's place"
              className={inputClass}
            />
          </label>
        </div>
      </div>

      {/* Players */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-100 p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">
          Players & chips
        </h2>
        {players.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Add players on the Players tab first.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {players.map((p) => {
              const r = rows[p.id];
              const cashOut = parse(r.cashOut);
              const buySum = r.buyIns.reduce((s, b) => {
                const v = parse(b);
                return s + (v && v > 0 ? v : 0);
              }, 0);
              const net = (cashOut ?? 0) - buySum;
              return (
                <li
                  key={p.id}
                  className={`rounded-xl border p-3 ${
                    r.included
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-zinc-200"
                  }`}
                >
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={r.included}
                      onChange={(e) =>
                        update(p.id, { included: e.target.checked })
                      }
                      className="h-4 w-4 accent-emerald-600"
                    />
                    <span className="font-medium text-zinc-900">{p.name}</span>
                    {r.included ? (
                      <span
                        className={`ml-auto text-sm font-semibold ${
                          net > 0
                            ? "text-emerald-400"
                            : net < 0
                              ? "text-red-400"
                              : "text-zinc-400"
                        }`}
                      >
                        {formatMoney(net, currency, { signed: true })}
                      </span>
                    ) : null}
                  </label>

                  {r.included ? (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <span className="mb-1 block text-xs text-zinc-500">
                          Buy-in(s)
                        </span>
                        <div className="flex flex-col gap-2">
                          {r.buyIns.map((b, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                inputMode="decimal"
                                value={b}
                                onChange={(e) => {
                                  const next = [...r.buyIns];
                                  next[i] = e.target.value;
                                  update(p.id, { buyIns: next });
                                }}
                                placeholder="0"
                                className={inputClass}
                              />
                              {r.buyIns.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    update(p.id, {
                                      buyIns: r.buyIns.filter(
                                        (_, j) => j !== i
                                      ),
                                    })
                                  }
                                  className="shrink-0 rounded-lg border border-zinc-200 px-2 py-2 text-xs text-zinc-500 hover:bg-zinc-50"
                                  aria-label="Remove buy-in"
                                >
                                  ✕
                                </button>
                              ) : null}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              update(p.id, { buyIns: [...r.buyIns, ""] })
                            }
                            className="self-start text-xs font-medium text-emerald-400 hover:underline"
                          >
                            + Add re-buy
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="mb-1 block text-xs text-zinc-500">
                          Cash-out (final stack)
                        </span>
                        <input
                          inputMode="decimal"
                          value={r.cashOut}
                          onChange={(e) =>
                            update(p.id, { cashOut: e.target.value })
                          }
                          placeholder="0"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Verification banner */}
      <VerificationBanner
        included={included.length}
        totalBuyIn={totalBuyIn}
        totalCashOut={totalCashOut}
        discrepancy={discrepancy}
        withinTolerance={withinTolerance}
        tolerance={tolerance}
        currencyCode={currencyCode}
      />

      {serverErrors.length > 0 ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <ul className="list-inside list-disc">
            {serverErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push(`/r/${code}/games`)}
          className="rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save game"}
        </button>
      </div>

      {/* Notes */}
      <label className="text-sm">
        <span className="mb-1 block text-zinc-600">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </label>
    </div>
  );
}

function VerificationBanner({
  included,
  totalBuyIn,
  totalCashOut,
  discrepancy,
  withinTolerance,
  tolerance,
  currencyCode,
}: {
  included: number;
  totalBuyIn: number;
  totalCashOut: number;
  discrepancy: number;
  withinTolerance: boolean;
  tolerance: number;
  currencyCode: string;
}) {
  const currency = getCurrency(currencyCode);
  const fmt = (n: number) => formatMoney(n, currency);

  let tone = "border-zinc-200 bg-zinc-50 text-zinc-600";
  let headline = "Add at least two players to check the chips.";

  if (included >= 2) {
    if (discrepancy === 0) {
      tone = "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
      headline = "Balanced — buy-ins match cash-outs exactly.";
    } else if (withinTolerance) {
      tone = "border-amber-500/30 bg-amber-500/10 text-amber-300";
      headline = `Off by ${fmt(Math.abs(discrepancy))} (within the ${fmt(
        tolerance
      )} tolerance) — will be saved and flagged.`;
    } else {
      tone = "border-red-500/30 bg-red-500/10 text-red-300";
      headline = `Off by ${fmt(Math.abs(discrepancy))} — over the ${fmt(
        tolerance
      )} tolerance. Recount before saving.`;
    }
  }

  return (
    <div className={`rounded-xl border p-3 text-sm ${tone}`}>
      <div className="font-medium">{headline}</div>
      <div className="mt-1 flex gap-4 text-xs opacity-90">
        <span>Total in: {fmt(totalBuyIn)}</span>
        <span>Total out: {fmt(totalCashOut)}</span>
      </div>
    </div>
  );
}
