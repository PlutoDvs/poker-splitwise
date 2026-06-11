"use client";
import { useEffect } from "react";
import { rememberRoom } from "@/lib/recent-rooms";

/** Records the current room in this device's recent-rooms cache. Renders nothing. */
export function RememberRoom({
  code,
  name,
  mode,
}: {
  code: string;
  name: string;
  mode: "admin" | "view";
}) {
  useEffect(() => {
    rememberRoom({ code, name, mode });
  }, [code, name, mode]);
  return null;
}
