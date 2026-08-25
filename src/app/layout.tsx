import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SevaSaarthiProvider } from "@/lib/store/formly-store";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
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
          <div className="min-h-screen flex bg-slate-50/50">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <Header />
              <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
                {children}
              </main>
            </div>
          </div>

          <Toaster position="top-right" richColors closeButton />
        </SevaSaarthiProvider>
      </body>
    </html>
  );
}
