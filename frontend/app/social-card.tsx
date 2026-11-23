import { ImageResponse } from "next/og";

export const socialCardSize = { width: 1200, height: 630 };

export function SocialCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: "linear-gradient(135deg, #fafaf9 0%, #fffbeb 58%, #fff7ed 100%)",
        color: "#292524",
        padding: "76px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 30, maxWidth: 920 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 68, height: 68, borderRadius: 18, background: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="6" width="12" height="12" rx="3" fill="white" />
              <path d="m15 10 5-3v10l-5-3v-4Z" fill="white" />
            </svg>
          </div>
          <span style={{ fontSize: 32, fontWeight: 700 }}>Pockets</span>
        </div>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2 }}>
          Meet in a pocket studio.
        </div>
        <div style={{ fontSize: 27, color: "#57534e", lineHeight: 1.4 }}>
          Face-to-face conversations, chat, and file sharing in a room of your own.
        </div>
      </div>
    </div>
  );
}

export function createSocialImage() {
  return new ImageResponse(<SocialCard />, socialCardSize);
}
