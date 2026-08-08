import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activate,
  completeOnboardingActivation,
  detectPlatform,
  getActivationState,
  getStoredActivation,
  retryPendingSync,
  sendActivation,
} from "./onboarding";

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

describe("detectPlatform", () => {
  it("erkennt iOS (iPhone und iPad)", () => {
    expect(detectPlatform(IOS_UA)).toBe("ios");
    expect(detectPlatform(IPAD_UA)).toBe("ios");
  });

  it("erkennt Android", () => {
    expect(detectPlatform(ANDROID_UA)).toBe("android");
  });

  it("fällt für Desktop/unbekannt auf 'other' zurück", () => {
    expect(detectPlatform(DESKTOP_UA)).toBe("other");
    expect(detectPlatform("")).toBe("other");
  });
});

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

describe("Aktivierungs-Zustandslogik", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMockLocalStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("'new': keine Aktivierung in localStorage vorhanden", () => {
    expect(getActivationState()).toBe("new");
    expect(getStoredActivation()).toBeNull();
  });

  it("'activated': nach erfolgreichem Sync", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "11111111-1111-4111-8111-111111111111" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );

    await activate("android");

    expect(getActivationState()).toBe("activated");
    expect(getStoredActivation()).toEqual({ uuid: "11111111-1111-4111-8111-111111111111", platform: "android" });
  });

  it("Retry-Fall: 'pending-sync', wenn der Server-Sync fehlschlägt (offline/API down)", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "22222222-2222-4222-8222-222222222222" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network error");
      }),
    );

    // Aktivierung darf nie blockieren oder werfen, auch wenn der Sync fehlschlägt.
    await expect(activate("ios")).resolves.toBeUndefined();

    expect(getActivationState()).toBe("pending-sync");
    expect(getStoredActivation()).toEqual({ uuid: "22222222-2222-4222-8222-222222222222", platform: "ios" });
  });

  it("retryPendingSync holt einen ausstehenden Sync nach und markiert ihn danach als 'activated'", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "33333333-3333-4333-8333-333333333333" });
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await activate("other");
    expect(getActivationState()).toBe("pending-sync");

    await retryPendingSync();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getActivationState()).toBe("activated");
  });

  it("retryPendingSync tut nichts, wenn bereits synchronisiert oder noch nie aktiviert", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await retryPendingSync();
    expect(fetchMock).not.toHaveBeenCalled();

    vi.stubGlobal("crypto", { randomUUID: () => "44444444-4444-4444-8444-444444444444" });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await activate("android");
    fetchMock.mockClear();

    await retryPendingSync();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bleibt 'pending-sync', wenn der Server einen Fehlerstatus liefert (kein Wurf)", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "55555555-5555-4555-8555-555555555555" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: false }), { status: 503 })),
    );

    expect(await sendActivation("55555555-5555-4555-8555-555555555555", "other")).toBe(false);
  });
});

describe("completeOnboardingActivation (Aktivierung + Push-Erinnerungen, gemockte Notification-API)", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMockLocalStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function stubPushEnvironment(permission: NotificationPermission) {
    const subscription = {
      toJSON: () => ({ endpoint: "https://push.example/x", keys: { p256dh: "p", auth: "a" } }),
      unsubscribe: vi.fn(async () => true),
    };
    const pushManager = {
      subscribe: vi.fn(async () => subscription),
      getSubscription: vi.fn(async () => subscription),
    };
    const registration = { pushManager };
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal("PushManager", function PushManager() {});
    vi.stubGlobal("Notification", { permission, requestPermission: vi.fn(async () => permission) });
    vi.stubGlobal("navigator", {
      serviceWorker: { ready: Promise.resolve(registration), getRegistration: vi.fn(async () => registration) },
    });
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "AAAA");
    return { pushManager };
  }

  it("granted: aktiviert UND sendet eine Push-Subscription", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "aaaaaaaa-1111-4111-8111-111111111111" });
    const { pushManager } = stubPushEnvironment("granted");
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await completeOnboardingActivation("android", "Europe/Zurich");

    expect(getActivationState()).toBe("activated");
    expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(["/api/activate", "/api/push/subscribe"]);
  });

  it("denied: Aktivierung schliesst trotzdem ab, keine Subscription", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "bbbbbbbb-2222-4222-8222-222222222222" });
    const { pushManager } = stubPushEnvironment("denied");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await completeOnboardingActivation("android", "Europe/Zurich");

    expect(getActivationState()).toBe("activated");
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/activate", expect.anything());
  });

  it("Push-API nicht vorhanden / iOS im Browser-Tab: kein Permission-Aufruf, kein Fehler, Aktivierung schliesst ab", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "cccccccc-3333-4333-8333-333333333333" });
    // iOS + nicht standalone -> shouldOfferPushPrompt liefert false; requestPermission darf
    // dann gar nicht erst aufgerufen werden.
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal("navigator", {});
    const requestPermission = vi.fn(async () => "granted");
    vi.stubGlobal("Notification", { permission: "default", requestPermission });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await completeOnboardingActivation("ios", "Europe/Zurich");

    expect(getActivationState()).toBe("activated");
    expect(requestPermission).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/activate", expect.anything());
  });
});
