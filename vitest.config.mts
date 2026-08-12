import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Ergänzt vitest um denselben "@/*"-Alias, den tsconfig.json (und damit Next.js selbst)
// bereits kennt – ohne dieses Mapping können Tests Module wie app/api/*/route.ts, die
// intern "@/lib/..." importieren, nicht auflösen (vitest teilt Next.js' Bundler-Resolver
// nicht automatisch).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
