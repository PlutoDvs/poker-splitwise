import { redirect } from "next/navigation";
import { loadRoom } from "@/lib/room-access";
import { getCurrency, formatMoney, CURRENCY_OPTIONS } from "@/lib/currency";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { room, mode } = await loadRoom(code);
  if (mode !== "admin") redirect(`/r/${code}`);

  const currency = getCurrency(room.currencyCode);
  const toleranceDisplay = formatMoney(room.tolerance, currency, {
    withSymbol: false,
  });
  const currencies = CURRENCY_OPTIONS.map((c) => ({
    code: c.code,
    label: c.label,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
        Settings
      </h1>
      <SettingsForm
        code={code}
        name={room.name}
        currencyCode={room.currencyCode}
        toleranceDisplay={toleranceDisplay}
        currencies={currencies}
      />
      <p className="text-xs text-zinc-400">
        Tip: set the currency before logging games. Changing it later re-scales
        how existing amounts are displayed.
      </p>
    </div>
  );
}
