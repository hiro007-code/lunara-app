import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureAdminTokenFromUrl,
  clearAdminToken,
  extractAdminTokenFromSearch,
  getStoredAdminToken,
  loadAdminStats,
} from "./admin";

function createMockLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

/** Stubbt window mit ?admin=<token> und übernimmt ihn – Vorbereitung für loadAdminStats-Tests. */
function seedStoredToken(token: string) {
  vi.stubGlobal("window", {
    location: { href: `https://lunara.app/planung?admin=${token}`, search: `?admin=${token}` },
    history: { replaceState: vi.fn() },
  });
  captureAdminTokenFromUrl();
}

describe("extractAdminTokenFromSearch", () => {
  it("liest den admin-Parameter aus dem Query-String", () => {
    expect(extractAdminTokenFromSearch("?admin=geheim123")).toBe("geheim123");
    expect(extractAdminTokenFromSearch("?foo=bar&admin=geheim123")).toBe("geheim123");
  });

  it("liefert null ohne oder mit leerem admin-Parameter", () => {
    expect(extractAdminTokenFromSearch("")).toBeNull();
    expect(extractAdminTokenFromSearch("?foo=bar")).toBeNull();
    expect(extractAdminTokenFromSearch("?admin=")).toBeNull();
  });
});

describe("captureAdminTokenFromUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMockLocalStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("speichert den Token und entfernt sofort nur ihn aus der URL, andere Parameter bleiben", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: { href: "https://lunara.app/planung?admin=geheim123&foo=bar", search: "?admin=geheim123&foo=bar" },
      history: { replaceState },
    });

    captureAdminTokenFromUrl();

    expect(getStoredAdminToken()).toBe("geheim123");
    expect(replaceState).toHaveBeenCalledTimes(1);
    const [, , url] = replaceState.mock.calls[0];
    expect(url).toBe("/planung?foo=bar");
  });

  it("tut nichts ohne admin-Parameter in der URL", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: { href: "https://lunara.app/planung", search: "" },
      history: { replaceState },
    });

    captureAdminTokenFromUrl();

    expect(getStoredAdminToken()).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("ohne Browser-Umgebung (window undefined): kein Fehler", () => {
    expect(() => captureAdminTokenFromUrl()).not.toThrow();
    expect(getStoredAdminToken()).toBeNull();
  });
});

describe("clearAdminToken", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMockLocalStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("entfernt einen zuvor übernommenen Token", () => {
    seedStoredToken("geheim123");
    expect(getStoredAdminToken()).toBe("geheim123");

    clearAdminToken();

    expect(getStoredAdminToken()).toBeNull();
  });
});

describe("loadAdminStats (Panel-Sichtbarkeitslogik)", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMockLocalStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("'hidden': kein gespeicherter Token, kein Netzwerk-Aufruf", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadAdminStats()).resolves.toEqual({ status: "hidden" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("'visible': gültiger Token liefert die Stats vom Server", async () => {
    seedStoredToken("geheim123");
    const stats = {
      total: 12,
      last7days: 3,
      weekly: [{ weekStart: "2026-08-03", count: 2 }],
      platforms: { ios: 5, android: 6, other: 1 },
      pushSubscriptions: 4,
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(stats), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadAdminStats()).resolves.toEqual({ status: "visible", stats });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stats",
      expect.objectContaining({ headers: { "x-admin-token": "geheim123" } }),
    );
    expect(getStoredAdminToken()).toBe("geheim123");
  });

  it("'invalid-token': 401 verwirft den gespeicherten Token", async () => {
    seedStoredToken("falsch");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: false }), { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadAdminStats()).resolves.toEqual({ status: "invalid-token" });
    expect(getStoredAdminToken()).toBeNull();
  });

  it("'unavailable': Serverfehler (z. B. DB down) behält den Token, zeigt aber keine Zahlen", async () => {
    seedStoredToken("geheim123");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: false }), { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadAdminStats()).resolves.toEqual({ status: "unavailable" });
    expect(getStoredAdminToken()).toBe("geheim123");
  });

  it("'unavailable': Netzwerkfehler wirft nie und behält den Token", async () => {
    seedStoredToken("geheim123");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );

    await expect(loadAdminStats()).resolves.toEqual({ status: "unavailable" });
    expect(getStoredAdminToken()).toBe("geheim123");
  });
});
