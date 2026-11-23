import type { Metadata } from "next";
import {
  Archivo,
  Montserrat,
  Quicksand,
  Inter,
} from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/custom/theme-provider";
import { siteDescription, siteName, siteUrl } from "@/lib/site";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const quickSand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

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
        className={`${archivo.variable} ${montserrat.variable} ${quickSand.variable} ${inter.variable} antialiased`}
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
