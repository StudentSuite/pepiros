"use client";

/**
 * Last-resort boundary, for an error thrown in the root layout itself.
 *
 * It replaces the whole document, so it must render its own <html> and <body>
 * and cannot rely on the app's fonts, tokens, or theme class being present.
 * Everything here is therefore inline and self-contained on purpose.
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
          background: "#f7f3ea",
          color: "#1c1a15",
          fontFamily: "Georgia, 'Times New Roman', serif",
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
              border: "1px solid #c6baa3",
              borderRadius: "10px",
              background: "#fdfbf6",
              color: "#1c1a15",
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
