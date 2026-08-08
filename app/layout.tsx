import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomBar } from "@/components/BottomBar";
import { TimezoneLabel } from "@/components/TimezoneLabel";
import { TimezoneProvider } from "@/components/TimezoneProvider";

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
        <TimezoneProvider>
          <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
            <div className="flex justify-end px-6 pt-6">
              <TimezoneLabel />
            </div>
            <main className="flex flex-1 flex-col px-6 pb-16">{children}</main>
            <BottomBar />
          </div>
        </TimezoneProvider>
      </body>
    </html>
  );
}
