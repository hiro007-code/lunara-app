import { NextResponse } from "next/server";
import { isValidPlatform, isValidUuid } from "@/lib/activation";
import { getSql, isDatabaseConfigured } from "@/lib/db";

// Backend-Ausnahme für den anonymen Aktivierungszähler (SPEC.md §2.5, §4).
// Kein IP-Log, kein User-Agent, kein sonstiges Logging – nur UUID + Plattform.
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

  const { uuid, platform } = (body ?? {}) as { uuid?: unknown; platform?: unknown };

  if (!isValidUuid(uuid) || !isValidPlatform(platform)) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  try {
    const sql = getSql();
    await sql`
      INSERT INTO activations (uuid, platform)
      VALUES (${uuid}, ${platform})
      ON CONFLICT (uuid) DO NOTHING
    `;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "database_error" }, { status: 503 });
  }
}
