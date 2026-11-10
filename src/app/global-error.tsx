"use client";

// Only reached if the root layout itself throws (ThemeProvider, fonts,
// QueryProvider) — everything error.tsx can't catch, since error.tsx
// doesn't wrap its own segment's layout. This replaces the whole
// <html>/<body> and, per Next's docs, does NOT inherit globals.css, fonts,
// or the theme class ThemeProvider would normally set — so it imports
// globals.css itself. There's no ThemeProvider here to toggle the `.dark`
// class, so this always renders the `:root` (light-mode) token values —
// still the app's real design tokens, just permanently light rather than
// reading a theme it has no provider to resolve. Kept deliberately plain
// (no Card/Button primitives) since a root-layout crash means those
// components' own styling may be exactly what's broken.
import "./globals.css";

export default function GlobalError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center text-foreground">
        <h1 className="text-lg font-medium">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The app ran into a problem loading. Try again, or reload the page.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
