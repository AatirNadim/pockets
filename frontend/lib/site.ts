const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
export const siteUrl = new URL(
  configuredSiteUrl ??
    (process.env.NODE_ENV === "production"
      ? "https://pockets.aatirnadim.dev"
      : "http://localhost:3000")
);

export const siteName = "Pockets";
export const siteTitle = "Pockets — Video rooms, chat & file sharing";
export const siteDescription =
  "Create a temporary browser-based room for video calls, chat, and peer-to-peer file sharing. No account required; hosts approve guests.";
