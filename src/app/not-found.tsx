import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center gap-4 px-5 py-12 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-200 text-2xl">
        ♠
      </div>
      <h1 className="text-xl font-semibold text-zinc-900">Group not found</h1>
      <p className="text-sm text-zinc-500">
        That link or code doesn&apos;t match any group. Double-check it, or
        create a new group.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Go home
      </Link>
    </main>
  );
}
