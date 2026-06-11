import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "L Health",
  description: "Track daily water, exercise, body stats, and goals.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
