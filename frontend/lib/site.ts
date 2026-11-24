const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const vercelHost = process.env.VERCEL_URL;

export const siteUrl = new URL(
  configuredSiteUrl ?? (vercelHost ? `https://${vercelHost}` : "http://localhost:3000")
);

export const siteName = "Pockets";
export const siteDescription =
  "Create a private, temporary room for face-to-face conversation, chat, and direct file sharing.";
