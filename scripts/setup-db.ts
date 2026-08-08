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

  // Eine Subscription pro Aktivierung (uuid als Primary Key): erneutes Abonnieren
  // (z. B. nach Zeitzonenwechsel) aktualisiert die bestehende Zeile per Upsert.
  await sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      uuid UUID PRIMARY KEY REFERENCES activations(uuid),
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      timezone TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Doppelsendungs-Schutz für den Cron-Versand (SPEC.md §2.6) – nachträglich
  // ergänzt, daher als eigene idempotente ALTER-Anweisung statt in CREATE TABLE.
  await sql`
    ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ
  `;

  console.log("Tabellen 'activations' und 'push_subscriptions' (inkl. last_notified_at) sind bereit.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
