const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const vercelHost = process.env.VERCEL_URL;

export const siteUrl = new URL(
  configuredSiteUrl ?? (vercelHost ? `https://${vercelHost}` : "http://localhost:3001")
);

export const siteName = "Pockets";
export const siteDescription =
  "Meet, talk, and share in a pocket studio. Temporary, host-approved rooms for face-to-face conversation and direct WebRTC peer-to-peer file sharing.";
