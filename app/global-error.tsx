"use client";

/**
 * Last-resort boundary, for an error thrown in the root layout itself.
 *
 * It replaces the whole document, so it must render its own <html> and <body>
 * and cannot rely on the app's fonts, tokens, or theme class being present.
 * Everything here is therefore inline and self-contained on purpose: this is
 * the one file in the repo where a literal hex is correct rather than a token
 * bypass, because the stylesheet that defines the tokens is exactly what has
 * failed by the time this renders.
 *
 * The values are still kept in step with app/globals.css by hand. Light
 * theme only, deliberately: with no theme class and no next-themes script,
 * there is nothing here to read a preference from, and a light error page on
 * a dark system is a far smaller problem than an unreadable one.
 *   #F5F1E6  --surface
 *   #FBF8EF  --surface-raised
 *   #1B1812  --ink
 *   #CBBEA3  --border-strong
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
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#F5F1E6",
          color: "#1B1812",
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
            style={{
              marginTop: "20px",
              padding: "8px 16px",
              border: "1px solid #CBBEA3",
              borderRadius: "9999px",
              background: "#FBF8EF",
              color: "#1B1812",
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
