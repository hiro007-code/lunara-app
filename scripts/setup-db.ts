import { neon } from "@neondatabase/serverless";

// Einmaliges, idempotentes Schema-Setup für den anonymen Aktivierungszähler
// (SPEC.md §4). Aufruf: npm run db:setup (lädt .env.local via node --env-file).

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL ist nicht gesetzt (siehe .env.local).");
    process.exitCode = 1;
    return;
  }

  const sql = neon(databaseUrl);

  await sql`
    CREATE TABLE IF NOT EXISTS activations (
      uuid UUID PRIMARY KEY,
      activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      platform TEXT NOT NULL
    )
  `;

  console.log("Tabelle 'activations' ist bereit.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
