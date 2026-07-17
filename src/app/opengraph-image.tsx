import { ImageResponse } from "next/og";

export const alt =
  "Coffee Match — Conectando pessoas, uma xícara por vez. Speed dating presencial, 18+.";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Brand palette (mirrors globals.css)
const ESPRESSO = "#1a100c";
const ESPRESSO_WARM = "#2a1a12";
const PAPER_DARK = "#120c09";
const COFFEE = "#b87333";
const CHAMPAGNE = "#d4a574";
const CREAM = "#f5e6d3";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(165deg, ${ESPRESSO} 0%, ${ESPRESSO_WARM} 55%, ${PAPER_DARK} 100%)`,
          position: "relative",
        }}
      >
        {/* Subtle coffee glow */}
        <div
          style={{
            position: "absolute",
            top: -160,
            left: 240,
            width: 720,
            height: 720,
            borderRadius: 9999,
            background: `radial-gradient(circle at center, ${COFFEE}33 0%, ${COFFEE}14 45%, transparent 70%)`,
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "80px 120px",
          }}
        >
          <div
            style={{
              fontSize: 118,
              fontWeight: 700,
              color: CREAM,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              textAlign: "center",
            }}
          >
            Coffee Match
          </div>

          {/* Divider */}
          <div
            style={{
              width: 120,
              height: 2,
              marginTop: 36,
              marginBottom: 32,
              background: `linear-gradient(90deg, transparent, ${CHAMPAGNE}, transparent)`,
            }}
          />

          <div
            style={{
              fontSize: 38,
              color: CHAMPAGNE,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            Conectando pessoas, uma xícara por vez.
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 56,
              padding: "14px 34px",
              borderRadius: 9999,
              border: `1px solid ${CREAM}40`,
              color: CREAM,
              fontSize: 24,
              letterSpacing: "0.08em",
            }}
          >
            Speed dating presencial · 18+
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
