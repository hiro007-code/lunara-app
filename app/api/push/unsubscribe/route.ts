import { NextResponse } from "next/server";
import { isValidUuid } from "@/lib/activation";
import { getSql, isDatabaseConfigured } from "@/lib/db";

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

  const { uuid } = (body ?? {}) as { uuid?: unknown };

  if (!isValidUuid(uuid)) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  try {
    const sql = getSql();
    await sql`DELETE FROM push_subscriptions WHERE uuid = ${uuid}`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "database_error" }, { status: 503 });
  }
}
