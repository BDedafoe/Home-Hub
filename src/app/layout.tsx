import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Hub",
  description: "A private household command center for shared daily life."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
