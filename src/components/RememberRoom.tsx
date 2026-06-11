"use client";
import { useEffect } from "react";
import { rememberRoom } from "@/lib/recent-rooms";

/** Records the current room in this device's recent-rooms cache. Renders nothing. */
export function RememberRoom({
  id,
  code,
  name,
  mode,
}: {
  id: string;
  code: string;
  name: string;
  mode: "admin" | "view";
}) {
  useEffect(() => {
    rememberRoom({ id, code, name, mode });
  }, [id, code, name, mode]);
  return null;
}
