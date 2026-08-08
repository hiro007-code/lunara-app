"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Mond" },
  { href: "/planung", label: "Planung" },
] as const;

export function BottomBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-background">
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`focus-ring flex-1 py-4 text-center text-sm transition-colors ${
                isActive ? "text-foreground" : "text-foreground-muted"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
