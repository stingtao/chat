import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LangRedirector from "@/components/i18n/LangRedirector";

export const metadata: Metadata = {
  title: "chat - Create Your Own Branded Chat Community",
  description: "Multi-tenant chat platform with customizable workspaces",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "chat",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased flex flex-col min-h-screen">
        <Suspense fallback={null}>
          <LangRedirector />
          <Navbar />
        </Suspense>
        <main className="flex-1">
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </main>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </body>
    </html>
  );
}
