import { CURRENCY_OPTIONS, DEFAULT_CURRENCY_CODE } from "@/lib/currency";
import { LandingForms } from "@/components/LandingForms";
import { RecentRooms } from "@/components/RecentRooms";

export default function Home() {
  const currencies = CURRENCY_OPTIONS.map((c) => ({
    code: c.code,
    label: c.label,
  }));

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-5 py-12">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-2xl">
          ♠
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Poker Ledger
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
          Log each night&apos;s buy-ins and cash-outs, check the chips balance,
          and settle up with the fewest possible payments.
        </p>
      </div>
      <div className="flex flex-col gap-5">
        <RecentRooms />
        <LandingForms
          currencies={currencies}
          defaultCurrency={DEFAULT_CURRENCY_CODE}
        />
      </div>
      <p className="mt-6 text-center text-xs text-zinc-400">
        Keep your admin link private — anyone with it can edit the group.
      </p>
    </main>
  );
}
