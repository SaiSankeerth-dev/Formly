import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SevaSaarthiProvider } from "@/lib/store/formly-store";
import { AppLayoutShell } from "@/components/layout/AppLayoutShell";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Seva Saarthi — Your Government Application Assistant",
  description: "Personal preparation and guidance layer for government schemes, scholarships, and welfare programs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SevaSaarthiProvider>
          <AppLayoutShell>{children}</AppLayoutShell>
          <Toaster position="top-right" richColors closeButton />
        </SevaSaarthiProvider>
      </body>
    </html>
  );
}
