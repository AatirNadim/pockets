import type { Metadata } from "next";
import "@fontsource/archivo/variable.css";
import "@fontsource/montserrat/variable.css";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
