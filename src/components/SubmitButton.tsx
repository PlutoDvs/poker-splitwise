"use client";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "danger" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const styles =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : variant === "ghost"
        ? "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
        : "bg-emerald-600 text-white hover:bg-emerald-700";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${styles} ${className}`}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
