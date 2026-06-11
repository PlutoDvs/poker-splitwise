"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getRecentRooms, forgetRoom, type RecentRoom } from "@/lib/recent-rooms";

export function RecentRooms() {
  // null until mounted, so server render and first client render both produce
  // nothing (no hydration mismatch); the list fills in after mount.
  const [rooms, setRooms] = useState<RecentRoom[] | null>(null);

  useEffect(() => {
    setRooms(getRecentRooms());
  }, []);

  if (!rooms || rooms.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-100 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-zinc-900">Your groups</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Saved on this device — tap to reopen instantly.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {rooms.map((r) => (
          <li key={r.code} className="flex items-center gap-2">
            <Link
              href={`/r/${r.code}`}
              className="flex flex-1 items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 hover:bg-emerald-500/10"
            >
              <span className="min-w-0 truncate font-medium text-zinc-900">
                {r.name}
              </span>
              <span
                className={`ml-3 shrink-0 text-xs font-medium ${
                  r.mode === "admin" ? "text-emerald-400" : "text-zinc-400"
                }`}
              >
                {r.mode === "admin" ? "Admin" : "View"}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setRooms(forgetRoom(r.code))}
              aria-label={`Remove ${r.name} from this device`}
              className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-2 text-xs text-zinc-500 hover:bg-zinc-50"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
