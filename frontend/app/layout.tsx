import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/custom/theme-provider";
import { siteDescription, siteName, siteUrl } from "@/lib/site";

const sohne = localFont({
  src: [
    { path: "../public/fonts/sohne-regular.otf", weight: "400", style: "normal" },
    { path: "../public/fonts/sohne-medium.otf", weight: "500", style: "normal" },
    { path: "../public/fonts/sohne-semibold.otf", weight: "600", style: "normal" },
    { path: "../public/fonts/sohne-bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-sohne",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: siteName,
  title: {
    default: "Pockets — Meet in a pocket studio",
    template: "%s | Pockets",
  },
  description: siteDescription,
  alternates: { canonical: "/" },
  icons: {
    icon: [{ url: "/icon", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName,
    title: "Pockets — Meet in a pocket studio",
    description: siteDescription,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pockets — Meet in a pocket studio",
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sohne.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
          <Toaster
            closeButton
            position="top-right"
            richColors
            duration={2000}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
