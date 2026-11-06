"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-lg font-medium">Something went wrong</h1>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
