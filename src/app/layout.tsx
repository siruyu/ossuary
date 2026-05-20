import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "../components/LayoutShell";
import AuthProvider from "../components/AuthProvider";
import { ThemeProvider } from "../components/ThemeProvider";

export const metadata: Metadata = {
  title: "PROJECT_GRAVEYARD.SYS - Digital Ossuary",
  description: "A social platform where developers inter their failed projects. Turning technical failure into reusable remains.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="scanline-overlay" />
        <AuthProvider>
          <ThemeProvider>
            <LayoutShell>{children}</LayoutShell>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
