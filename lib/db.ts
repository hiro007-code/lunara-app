import { neon } from "@neondatabase/serverless";

// Neon-Client-Helper (SPEC.md §4, Backend-Ausnahme für den Aktivierungszähler).
// neon() wirft, wenn DATABASE_URL fehlt – da Next.js Modul-Top-Level-Code auch
// zur Build-Zeit auswertet, würde ein direkter Aufruf beim Import "next build"
// ohne DATABASE_URL crashen lassen. Deshalb lazy erzeugen, erst bei echtem Bedarf.
// Explizite Generics nötig: ReturnType<typeof neon> allein löst ArrayMode/FullResults
// nicht zu ihren Defaults (false, false) auf und würde einen breiten Union-Rückgabetyp
// (u.a. FullQueryResults) statt eines einfachen, iterierbaren Zeilen-Arrays ergeben.
type Sql = ReturnType<typeof neon<false, false>>;

let cachedSql: Sql | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Wirft, wenn DATABASE_URL fehlt – vorher immer mit isDatabaseConfigured() prüfen. */
export function getSql(): Sql {
  if (!cachedSql) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL ist nicht gesetzt.");
    }
    cachedSql = neon(databaseUrl);
  }
  return cachedSql;
}
