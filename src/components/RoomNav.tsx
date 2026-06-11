"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function RoomNav({ code, isAdmin }: { code: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const base = `/r/${code}`;

  const tabs = [
    { href: base, label: "Dashboard", exact: true },
    { href: `${base}/games`, label: "Games", exact: false },
    { href: `${base}/stats`, label: "Stats", exact: false },
    ...(isAdmin
      ? [
          { href: `${base}/settle`, label: "Settle up", exact: false },
          { href: `${base}/players`, label: "Players", exact: false },
          { href: `${base}/settings`, label: "Settings", exact: false },
        ]
      : []),
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-emerald-600 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
