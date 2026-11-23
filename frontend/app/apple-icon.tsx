import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#d97706",
        borderRadius: 38,
      }}
    >
      <svg width="108" height="108" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="12" height="12" rx="3" fill="white" />
        <path d="m15 10 5-3v10l-5-3v-4Z" fill="white" />
      </svg>
    </div>,
    size
  );
}
