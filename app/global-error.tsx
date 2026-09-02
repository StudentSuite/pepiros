"use client";

/**
 * Last-resort boundary, for an error thrown in the root layout itself.
 *
 * It replaces the whole document, so it must render its own <html> and <body>
 * and cannot rely on the app's fonts, tokens, or theme class being present
 * (no next-themes script has run, so there is no .dark class to key off).
 * Everything here is therefore self-contained on purpose: this is the one
 * file in the repo where a literal hex is correct rather than a token
 * bypass, because the stylesheet that defines the tokens is exactly what
 * has failed by the time this renders.
 *
 * Issue #377: this used to be light-theme-only, reasoning that with no
 * theme class and no script there was "nothing here to read a preference
 * from" -- that reasoning doesn't hold, since prefers-color-scheme is a
 * pure-CSS media query, no script or class required. A dark-mode user
 * hitting a root-level crash got a full-screen flash of cream at maximum
 * brightness, the worst possible moment for it (something already went
 * wrong, and the recovery screen was physically uncomfortable). A plain
 * <style> tag with the media query is the standard pattern for this file
 * specifically, since inline `style` objects can't express a media query.
 *
 * Values kept in step with app/globals.css by hand:
 *   light --surface #F5F1E6 / --surface-raised #FBF8EF / --ink #1B1812 / --border-strong #CBBEA3
 *   dark  --surface #14120F / --surface-raised #1D1A16 / --ink #EDE7D9 / --border-strong #4A4234
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          .ge-body {
            background: #F5F1E6;
            color: #1B1812;
          }
          .ge-button {
            border-color: #CBBEA3;
            background: #FBF8EF;
            color: #1B1812;
          }
          @media (prefers-color-scheme: dark) {
            .ge-body {
              background: #14120F;
              color: #EDE7D9;
            }
            .ge-button {
              border-color: #4A4234;
              background: #1D1A16;
              color: #EDE7D9;
            }
          }
        `}</style>
      </head>
      <body
        className="ge-body"
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          // Geist is a webfont this page cannot count on having loaded, so
          // the stack is system-first rather than naming it.
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Pepiros failed to start.</h1>
          <p style={{ marginTop: "12px", fontSize: "0.9rem", lineHeight: 1.6 }}>
            Something went wrong before the page could render. Reloading is worth
            one try.
          </p>
          {error.digest && (
            <p style={{ marginTop: "12px", fontSize: "0.75rem", opacity: 0.7 }}>
              digest {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="ge-button"
            style={{
              marginTop: "20px",
              padding: "8px 16px",
              borderWidth: "1px",
              borderStyle: "solid",
              borderRadius: "9999px",
              cursor: "pointer",
              font: "inherit",
              fontSize: "0.9rem",
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
