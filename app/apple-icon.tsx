import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same glyph as components/ui/Logo.tsx and app/icon.svg -- keep in sync.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F5F1E8",
          borderRadius: 36,
        }}
      >
        <svg
          width="96"
          height="96"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#2A2A28"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3.5 6.2c2.4-.9 5.3-.9 7.7.4v10.7c-2.4-1.3-5.3-1.3-7.7-.4V6.2Z" />
          <path d="M20.5 6.2c-2.4-.9-5.3-.9-7.7.4v10.7c2.4-1.3 5.3-1.3 7.7-.4V6.2Z" />
          <path d="M13.5 8.8 19 4" />
          <path d="M17.7 4.2 19 4l-.2 1.3" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
