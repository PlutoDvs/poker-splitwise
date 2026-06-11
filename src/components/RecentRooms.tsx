"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getRecentRooms,
  forgetRoom,
  renameRoom,
  togglePinRoom,
  roomLabel,
  type RecentRoom,
} from "@/lib/recent-rooms";

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
          <RecentRoomRow
            key={r.code}
            room={r}
            onPin={() => setRooms(togglePinRoom(r.code))}
            onRemove={() => setRooms(forgetRoom(r.code))}
            onRename={(label) => setRooms(renameRoom(r.code, label))}
          />
        ))}
      </ul>
    </div>
  );
}

const iconBtn =
  "shrink-0 rounded-lg border border-zinc-200 px-2 py-2 text-xs text-zinc-500 hover:bg-zinc-50";

function RecentRoomRow({
  room,
  onPin,
  onRemove,
  onRename,
}: {
  room: RecentRoom;
  onPin: () => void;
  onRemove: () => void;
  onRename: (label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function startEdit() {
    setDraft(roomLabel(room));
    setEditing(true);
  }
  function save() {
    onRename(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="flex items-center gap-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder={room.name}
          className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="button"
          onClick={save}
          className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onPin}
        aria-label={room.pinned ? "Unpin group" : "Pin group"}
        title={room.pinned ? "Unpin" : "Pin to top"}
        className={`shrink-0 rounded-lg px-2 py-2 text-sm ${
          room.pinned
            ? "text-emerald-400"
            : "text-zinc-500 hover:bg-zinc-50"
        }`}
      >
        {room.pinned ? "★" : "☆"}
      </button>
      <Link
        href={`/r/${room.code}`}
        className="flex min-w-0 flex-1 items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 hover:bg-emerald-500/10"
      >
        <span className="min-w-0 truncate font-medium text-zinc-900">
          {roomLabel(room)}
        </span>
        <span
          className={`ml-3 shrink-0 text-xs font-medium ${
            room.mode === "admin" ? "text-emerald-400" : "text-zinc-400"
          }`}
        >
          {room.mode === "admin" ? "Admin" : "View"}
        </span>
      </Link>
      <button
        type="button"
        onClick={startEdit}
        aria-label="Rename group"
        title="Rename"
        className={iconBtn}
      >
        ✎
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove group from this device"
        title="Remove"
        className={iconBtn}
      >
        ✕
      </button>
    </li>
  );
}
