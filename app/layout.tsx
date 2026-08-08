import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomBar } from "@/components/BottomBar";
import { OnboardingGate } from "@/components/OnboardingGate";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { TimezoneLabel } from "@/components/TimezoneLabel";
import { TimezoneProvider } from "@/components/TimezoneProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Lunara",
  description: "Vollmond-Countdown und Ferienplanung ohne Vollmond-Risiko – auf einen Blick, komplett offline nutzbar.",
  // Next.js erzeugt aus appleWebApp.capable das standardisierte, unpräfigierte
  // "mobile-web-app-capable" (von aktuellem iOS Safari unterstützt) statt des
  // veralteten "apple-mobile-web-app-capable"; title/statusBarStyle erzeugen
  // weiterhin die klassischen apple-mobile-web-app-*-Tags.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lunara",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e1a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={inter.variable}>
      <body className="bg-background font-sans text-foreground antialiased">
        <ServiceWorkerRegistration />
        {/* TimezoneProvider umschliesst auch das Onboarding: Block 3 braucht die
            aktive Zeitzone bereits für die Push-Subscription (SPEC.md §2.5). */}
        <TimezoneProvider>
          <OnboardingGate>
            <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
              <div className="flex justify-end px-6 pt-6">
                <TimezoneLabel />
              </div>
              <main className="flex flex-1 flex-col px-6 pb-16">{children}</main>
              <BottomBar />
            </div>
          </OnboardingGate>
        </TimezoneProvider>
      </body>
    </html>
  );
}
