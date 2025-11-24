import type { Metadata } from "next";
import { Archivo, Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/custom/theme-provider";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pockets",
  description: "Pockets into collaborative spaces",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${archivo.variable} ${montserrat.variable} antialiased`}
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
