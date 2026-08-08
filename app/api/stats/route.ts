import { NextResponse } from "next/server";
import { getSql, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503 });
  }

  try {
    const sql = getSql();
    const [totalRow] = await sql`SELECT COUNT(*)::int AS count FROM activations`;
    const [last7Row] = await sql`
      SELECT COUNT(*)::int AS count FROM activations WHERE activated_at >= now() - interval '7 days'
    `;

    return NextResponse.json({
      total: totalRow.count as number,
      last7days: last7Row.count as number,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "database_error" }, { status: 503 });
  }
}
