import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomBar } from "@/components/BottomBar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Lunara",
  description: "Vollmond-Countdown & Ferienplanung",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={inter.variable}>
      <body className="bg-background font-sans text-foreground antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
          <main className="flex-1 pb-16">{children}</main>
          <BottomBar />
        </div>
      </body>
    </html>
  );
}
