import type { ReactNode } from "react";
import { getCurrency, formatMoney } from "@/lib/currency";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function PageTitle({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
        {title}
      </h1>
      {action}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-100/60 p-8 text-center">
      <p className="font-medium text-zinc-700">{title}</p>
      {hint ? <p className="mt-1 text-sm text-zinc-500">{hint}</p> : null}
    </div>
  );
}

/** Tailwind text-color class for a signed net/balance amount. */
export function netColor(amount: number): string {
  if (amount > 0) return "text-emerald-400";
  if (amount < 0) return "text-red-400";
  return "text-zinc-500";
}

export function Money({
  amount,
  currencyCode,
  signed = false,
  className = "",
}: {
  amount: number;
  currencyCode: string;
  signed?: boolean;
  className?: string;
}) {
  return (
    <span className={className}>
      {formatMoney(amount, getCurrency(currencyCode), { signed })}
    </span>
  );
}
