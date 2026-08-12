import { NextResponse } from "next/server";
import { PLATFORMS, type Platform } from "@/lib/activation";
import { getSql, isDatabaseConfigured } from "@/lib/db";

// Admin-Statistik (SPEC.md §2.7): seit Etappe 9 nicht mehr öffentlich, sondern nur mit
// gültigem x-admin-token-Header (gegen ADMIN_SECRET geprüft) erreichbar. Fehlt ADMIN_SECRET
// serverseitig, wird jede Anfrage abgelehnt statt versehentlich offen zu bleiben.
export const dynamic = "force-dynamic";

type WeeklyRow = { week_start: string; count: number };
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
    // Feste 12-Wochen-Serie via generate_series, damit auch Wochen ohne Aktivierung als 0
    // erscheinen statt in der Aggregation zu fehlen (sonst wirkt der Wochenverlauf lückenhaft).
    const weeklyRows = (await sql`
      SELECT to_char(gs, 'YYYY-MM-DD') AS week_start, COALESCE(a.count, 0)::int AS count
      FROM generate_series(
        date_trunc('week', now() - interval '11 weeks'),
        date_trunc('week', now()),
        interval '1 week'
      ) AS gs
      LEFT JOIN (
        SELECT date_trunc('week', activated_at) AS week_start, COUNT(*)::int AS count
        FROM activations
        GROUP BY week_start
      ) a ON a.week_start = gs
      ORDER BY gs
    `) as WeeklyRow[];
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
      weekly: weeklyRows.map((row) => ({ weekStart: row.week_start, count: row.count })),
      platforms,
      pushSubscriptions: pushRow.count as number,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "database_error" }, { status: 503 });
  }
}
