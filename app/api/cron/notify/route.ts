import { NextResponse } from "next/server";
import webpush from "web-push";
import { getSql, isDatabaseConfigured } from "@/lib/db";
import { nextFullMoon } from "@/lib/moon";
import { getReminderDay, wasAlreadyNotifiedToday } from "@/lib/reminder";
import { formatShortDate } from "@/lib/timezone";

// Täglicher Vollmond-Erinnerungs-Versand (SPEC.md §2.6), von Vercel Cron
// ausgelöst (vercel.json). Vercel setzt bei konfiguriertem CRON_SECRET
// automatisch den Authorization-Header – andere Aufrufer werden abgewiesen.
export const dynamic = "force-dynamic";

type SubscriptionRow = {
  uuid: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
  last_notified_at: string | null;
};

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503 });
  }

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return NextResponse.json({ ok: false, error: "vapid_not_configured" }, { status: 503 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const now = new Date();
  const sql = getSql();

  const subscriptions = (await sql`
    SELECT uuid, endpoint, p256dh, auth, timezone, last_notified_at FROM push_subscriptions
  `) as SubscriptionRow[];

  let sent = 0;
  let skipped = 0;
  let removed = 0;

  for (const subscription of subscriptions) {
    const reminderDay = getReminderDay(now, subscription.timezone);
    if (reminderDay === null) continue;

    const lastNotifiedAt = subscription.last_notified_at ? new Date(subscription.last_notified_at) : null;
    if (wasAlreadyNotifiedToday(now, subscription.timezone, lastNotifiedAt)) {
      skipped++;
      continue;
    }

    const fullMoonDate = formatShortDate(nextFullMoon(now), subscription.timezone);
    const payload = JSON.stringify({
      title: "Lunara",
      body: `Vollmond in ${reminderDay} Tagen – ${fullMoonDate}`,
    });

    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        payload,
      );
      await sql`UPDATE push_subscriptions SET last_notified_at = now() WHERE uuid = ${subscription.uuid}`;
      sent++;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // Subscription vom Browser/Push-Dienst invalidiert (z. B. abgemeldet, abgelaufen) – aufräumen.
        await sql`DELETE FROM push_subscriptions WHERE uuid = ${subscription.uuid}`;
        removed++;
      }
      // Andere Fehler (z. B. vorübergehender Netzwerkfehler) bewusst ignorieren – der
      // nächste Cron-Lauf versucht es erneut, last_notified_at bleibt entsprechend unverändert.
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, removed });
}
