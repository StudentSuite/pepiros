import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Grounding-first per PLAN-V1.md §22 -- the deterministic-verification
// pitch leads, platform ambition doesn't appear here at all.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#F5F1E8" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "80px",
            width: "58%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2A2A28"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 5.5c2.8-1 6.2-1 9 .5v13c-2.8-1.5-6.2-1.5-9-.5V5.5Z" />
              <path d="M22 5.5c-2.8-1-6.2-1-9 .5v13c2.8-1.5 6.2-1.5 9-.5V5.5Z" />
              <path d="M13.5 8.5 21 2" />
              <path d="M19.4 2.3 21 2l-.3 1.6" />
            </svg>
            <span style={{ fontSize: 34, letterSpacing: 6, color: "#2A2A28", fontWeight: 600 }}>
              PEPIROS
            </span>
          </div>
          <p style={{ marginTop: 28, fontSize: 30, lineHeight: 1.4, color: "#2A2A28", maxWidth: 520 }}>
            Every claim, one click from its source.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "42%",
            background: "#1b1e24",
          }}
        >
          <svg width="320" height="260" viewBox="0 0 320 260">
            <line x1="160" y1="60" x2="80" y2="150" stroke="#3C4048" strokeWidth={2} />
            <line x1="160" y1="60" x2="240" y2="150" stroke="#3C4048" strokeWidth={2} />
            <line x1="80" y1="150" x2="160" y2="220" stroke="#3C4048" strokeWidth={2} />
            <line x1="240" y1="150" x2="160" y2="220" stroke="#3C4048" strokeWidth={2} />
            <circle cx="160" cy="60" r="14" fill="#B8B2A4" />
            <circle cx="80" cy="150" r="12" fill="#6E6AA7" />
            <circle cx="240" cy="150" r="12" fill="#5F8D86" />
            <circle cx="160" cy="220" r="12" fill="#C4A78A" />
          </svg>
        </div>
      </div>
    ),
    { ...size },
  );
}
