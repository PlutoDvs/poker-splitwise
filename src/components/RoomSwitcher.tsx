"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getRecentRooms, roomLabel, type RecentRoom } from "@/lib/recent-rooms";

export function RoomSwitcher({
  currentCode,
  currentId,
}: {
  currentCode: string;
  currentId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<RecentRoom[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // Refresh the saved list each time the menu opens.
  useEffect(() => {
    if (open) setRooms(getRecentRooms());
  }, [open]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const others = rooms.filter(
    (r) => r.code !== currentCode && !(currentId && r.id === currentId)
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
      >
        Groups ▾
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 p-1 shadow-lg">
          {others.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-500">
              No other saved groups on this device.
            </p>
          ) : (
            others.map((r) => (
              <Link
                key={r.code}
                href={`/r/${r.code}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-zinc-50"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {r.pinned ? (
                    <span className="shrink-0 text-emerald-400">★</span>
                  ) : null}
                  <span className="min-w-0 truncate text-zinc-800">
                    {roomLabel(r)}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-xs ${
                    r.mode === "admin" ? "text-emerald-400" : "text-zinc-400"
                  }`}
                >
                  {r.mode === "admin" ? "Admin" : "View"}
                </span>
              </Link>
            ))
          )}
          <div className="my-1 border-t border-zinc-200" />
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            All groups &amp; new…
          </Link>
        </div>
      ) : null}
    </div>
  );
}
