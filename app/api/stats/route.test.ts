import { afterEach, describe, expect, it, vi } from "vitest";

const { isDatabaseConfigured, getSql } = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getSql: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ isDatabaseConfigured, getSql }));

import { GET } from "./route";

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://lunara.app/api/stats", { headers });
}

describe("GET /api/stats (Admin-Statistik, SPEC.md §2.7)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("lehnt eine Anfrage ohne x-admin-token ab (401), ohne die Datenbank anzufragen", async () => {
    vi.stubEnv("ADMIN_SECRET", "richtig");

    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(getSql).not.toHaveBeenCalled();
  });

  it("lehnt einen falschen Token ab (401)", async () => {
    vi.stubEnv("ADMIN_SECRET", "richtig");

    const response = await GET(makeRequest({ "x-admin-token": "falsch" }));

    expect(response.status).toBe(401);
    expect(getSql).not.toHaveBeenCalled();
  });

  it("lehnt jeden Token ab, wenn ADMIN_SECRET serverseitig nicht konfiguriert ist", async () => {
    vi.stubEnv("ADMIN_SECRET", "");

    const response = await GET(makeRequest({ "x-admin-token": "irgendwas" }));

    expect(response.status).toBe(401);
    expect(getSql).not.toHaveBeenCalled();
  });

  it("akzeptiert einen gültigen Token und liefert die erweiterten Stats", async () => {
    vi.stubEnv("ADMIN_SECRET", "richtig");
    isDatabaseConfigured.mockReturnValue(true);

    const sql = vi
      .fn()
      .mockResolvedValueOnce([{ count: 42 }])
      .mockResolvedValueOnce([{ count: 5 }])
      .mockResolvedValueOnce([
        { week_start: "2026-05-25", count: 0 },
        { week_start: "2026-06-01", count: 3 },
      ])
      .mockResolvedValueOnce([
        { platform: "ios", count: 20 },
        { platform: "android", count: 22 },
      ])
      .mockResolvedValueOnce([{ count: 7 }]);
    getSql.mockReturnValue(sql);

    const response = await GET(makeRequest({ "x-admin-token": "richtig" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      total: 42,
      last7days: 5,
      weekly: [
        { weekStart: "2026-05-25", count: 0 },
        { weekStart: "2026-06-01", count: 3 },
      ],
      platforms: { ios: 20, android: 22, other: 0 },
      pushSubscriptions: 7,
    });
  });

  it("liefert 503, wenn die Datenbank nicht konfiguriert ist (auch mit gültigem Token)", async () => {
    vi.stubEnv("ADMIN_SECRET", "richtig");
    isDatabaseConfigured.mockReturnValue(false);

    const response = await GET(makeRequest({ "x-admin-token": "richtig" }));

    expect(response.status).toBe(503);
    expect(getSql).not.toHaveBeenCalled();
  });

  it("liefert 503 bei einem Datenbankfehler, statt zu werfen", async () => {
    vi.stubEnv("ADMIN_SECRET", "richtig");
    isDatabaseConfigured.mockReturnValue(true);
    getSql.mockReturnValue(
      vi.fn(async () => {
        throw new Error("db down");
      }),
    );

    const response = await GET(makeRequest({ "x-admin-token": "richtig" }));

    expect(response.status).toBe(503);
  });
});
