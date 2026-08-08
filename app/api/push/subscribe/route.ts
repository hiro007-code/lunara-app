import { NextResponse } from "next/server";
import { isValidUuid } from "@/lib/activation";
import { getSql, isDatabaseConfigured } from "@/lib/db";
import { isValidPushSubscription } from "@/lib/push";
import { isValidTimezone } from "@/lib/timezone";

// Speichert/aktualisiert eine Push-Subscription für Vollmond-Erinnerungen (SPEC.md §2.5).
// Ein Upsert pro uuid: erneutes Abonnieren (z. B. nach Zeitzonenwechsel) überschreibt die
// bestehende Zeile. Kein IP-Log, kein User-Agent, kein sonstiges Logging.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { uuid, timezone, subscription } = (body ?? {}) as {
    uuid?: unknown;
    timezone?: unknown;
    subscription?: unknown;
  };

  if (!isValidUuid(uuid) || !isValidTimezone(timezone) || !isValidPushSubscription(subscription)) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  try {
    const sql = getSql();
    await sql`
      INSERT INTO push_subscriptions (uuid, endpoint, p256dh, auth, timezone)
      VALUES (${uuid}, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth}, ${timezone})
      ON CONFLICT (uuid) DO UPDATE SET
        endpoint = EXCLUDED.endpoint,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        timezone = EXCLUDED.timezone,
        updated_at = now()
    `;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "database_error" }, { status: 503 });
  }
}
