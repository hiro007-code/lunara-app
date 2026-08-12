import { NextResponse } from "next/server";
import { PLATFORMS, type Platform } from "@/lib/activation";
import { getSql, isDatabaseConfigured } from "@/lib/db";

// Admin-Statistik (SPEC.md §2.7): seit Etappe 9 nicht mehr öffentlich, sondern nur mit
// gültigem x-admin-token-Header (gegen ADMIN_SECRET geprüft) erreichbar. Fehlt ADMIN_SECRET
// serverseitig, wird jede Anfrage abgelehnt statt versehentlich offen zu bleiben.
export const dynamic = "force-dynamic";

type PlatformRow = { platform: string; count: number };

export async function GET(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  const token = request.headers.get("x-admin-token");
  if (!adminSecret || token !== adminSecret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503 });
  }

  try {
    const sql = getSql();
    const [totalRow] = await sql`SELECT COUNT(*)::int AS count FROM activations`;
    const [last7Row] = await sql`
      SELECT COUNT(*)::int AS count FROM activations WHERE activated_at >= now() - interval '7 days'
    `;
    const platformRows = (await sql`
      SELECT platform, COUNT(*)::int AS count FROM activations GROUP BY platform
    `) as PlatformRow[];
    const [pushRow] = await sql`SELECT COUNT(*)::int AS count FROM push_subscriptions`;

    const platforms = Object.fromEntries(PLATFORMS.map((platform) => [platform, 0])) as Record<Platform, number>;
    for (const row of platformRows) {
      if ((PLATFORMS as readonly string[]).includes(row.platform)) {
        platforms[row.platform as Platform] = row.count;
      }
    }

    return NextResponse.json({
      total: totalRow.count as number,
      last7days: last7Row.count as number,
      platforms,
      pushSubscriptions: pushRow.count as number,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "database_error" }, { status: 503 });
  }
}
