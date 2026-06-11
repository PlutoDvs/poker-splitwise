// Currency configuration and money formatting.
//
// All money in this app is stored and computed as INTEGER MINOR UNITS:
//   - Toman:  decimals = 0  -> 5000 means 5,000 Toman
//   - USD/EUR/GBP: decimals = 2 -> 200 means $2.00
// This guarantees the settlement math never suffers floating-point drift.

export interface Currency {
  code: string; // ISO-ish code used as the stable key (stored on the room)
  label: string; // human label shown in the picker
  symbol: string; // display symbol
  decimals: number; // number of minor-unit decimal places
  symbolPosition: "prefix" | "suffix";
  defaultTolerance: number; // default chip-count tolerance, in minor units
}

export const CURRENCIES: Record<string, Currency> = {
  IRT: {
    code: "IRT",
    label: "Toman",
    symbol: "Toman",
    decimals: 0,
    symbolPosition: "suffix",
    defaultTolerance: 5000,
  },
  USD: {
    code: "USD",
    label: "US Dollar",
    symbol: "$",
    decimals: 2,
    symbolPosition: "prefix",
    defaultTolerance: 200,
  },
  EUR: {
    code: "EUR",
    label: "Euro",
    symbol: "€",
    decimals: 2,
    symbolPosition: "prefix",
    defaultTolerance: 200,
  },
  GBP: {
    code: "GBP",
    label: "British Pound",
    symbol: "£",
    decimals: 2,
    symbolPosition: "prefix",
    defaultTolerance: 200,
  },
};

export const DEFAULT_CURRENCY_CODE = "IRT";

export const CURRENCY_OPTIONS = Object.values(CURRENCIES);

export function getCurrency(code: string | null | undefined): Currency {
  if (code && CURRENCIES[code]) return CURRENCIES[code];
  return CURRENCIES[DEFAULT_CURRENCY_CODE];
}

/** Format an integer minor-unit amount for display (with thousands separators). */
export function formatMoney(
  minor: number,
  currency: Currency,
  opts: { withSymbol?: boolean; signed?: boolean } = {},
): string {
  const { withSymbol = true, signed = false } = opts;
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const factor = 10 ** currency.decimals;
  const whole = Math.floor(abs / factor);
  const frac = abs % factor;

  const wholeStr = whole.toLocaleString("en-US");
  const numStr =
    currency.decimals > 0
      ? `${wholeStr}.${frac.toString().padStart(currency.decimals, "0")}`
      : wholeStr;

  let out = numStr;
  if (withSymbol) {
    out =
      currency.symbolPosition === "prefix"
        ? `${currency.symbol}${numStr}`
        : `${numStr} ${currency.symbol}`;
  }

  const sign = negative ? "-" : signed ? "+" : "";
  return `${sign}${out}`;
}

/**
 * Parse a user-entered amount string into integer minor units.
 * Accepts grouping separators and the currency symbol. Returns null when the
 * input is not a valid non-negative number.
 */
export function parseMoney(input: string, currency: Currency): number | null {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (cleaned === "" || cleaned === ".") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 10 ** currency.decimals);
}
