import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  disablePushReminders,
  enablePushReminders,
  getNotificationPermissionState,
  getRemindersEnabled,
  isPushSupported,
  isStandaloneDisplay,
  isValidPushSubscription,
  shouldOfferPushPrompt,
  syncSubscriptionTimezone,
} from "./push";

const VALID_SUBSCRIPTION = {
  endpoint: "https://push.example.com/subscription/abc",
  keys: { p256dh: "p256dh-key-value", auth: "auth-key-value" },
};

describe("isValidPushSubscription", () => {
  it("akzeptiert eine korrekt geformte Subscription", () => {
    expect(isValidPushSubscription(VALID_SUBSCRIPTION)).toBe(true);
  });

  it("lehnt fehlende oder leere Felder ab", () => {
    expect(isValidPushSubscription({ endpoint: "", keys: { p256dh: "a", auth: "b" } })).toBe(false);
    expect(isValidPushSubscription({ endpoint: "https://x", keys: { p256dh: "", auth: "b" } })).toBe(false);
    expect(isValidPushSubscription({ endpoint: "https://x" })).toBe(false);
    expect(isValidPushSubscription(null)).toBe(false);
    expect(isValidPushSubscription("not an object")).toBe(false);
    expect(isValidPushSubscription(undefined)).toBe(false);
  });
});

describe("shouldOfferPushPrompt", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Android und Desktop/unbekannt bieten die Anfrage immer an", () => {
    expect(shouldOfferPushPrompt("android")).toBe(true);
    expect(shouldOfferPushPrompt("other")).toBe(true);
  });

  it("iOS im Browser-Tab (nicht standalone): keine Anfrage", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal("navigator", {});
    expect(shouldOfferPushPrompt("ios")).toBe(false);
  });

  it("iOS bereits standalone (installiert): verhält sich wie Android/Desktop", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    vi.stubGlobal("navigator", {});
    expect(shouldOfferPushPrompt("ios")).toBe(true);
  });
});

describe("isStandaloneDisplay", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("erkennt den display-mode: standalone Media-Query-Treffer", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    vi.stubGlobal("navigator", {});
    expect(isStandaloneDisplay()).toBe(true);
  });

  it("erkennt das legacy navigator.standalone (iOS Safari)", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal("navigator", { standalone: true });
    expect(isStandaloneDisplay()).toBe(true);
  });

  it("liefert false ohne beide Signale", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal("navigator", {});
    expect(isStandaloneDisplay()).toBe(false);
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

/** Richtet ein voll unterstütztes Browser-Umfeld ein (Notification, ServiceWorker, PushManager). */
function stubSupportedPushEnvironment(options: {
  permission?: NotificationPermission;
  subscribeImpl?: () => Promise<unknown>;
}) {
  const mockSubscription = {
    toJSON: () => VALID_SUBSCRIPTION,
    unsubscribe: vi.fn(async () => true),
  };

  const pushManager = {
    subscribe: vi.fn(options.subscribeImpl ?? (async () => mockSubscription)),
    getSubscription: vi.fn(async () => mockSubscription),
  };

  const registration = { pushManager };

  vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
  vi.stubGlobal("PushManager", function PushManager() {});
  vi.stubGlobal("Notification", {
    permission: options.permission ?? "default",
    requestPermission: vi.fn(async () => options.permission ?? "default"),
  });
  vi.stubGlobal("navigator", {
    serviceWorker: {
      ready: Promise.resolve(registration),
      getRegistration: vi.fn(async () => registration),
    },
  });
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "AAAA");

  return { pushManager, mockSubscription };
}

describe("Push-Erinnerungen: Aktivierungs-Flow (gemockte Notification-API)", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMockLocalStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("granted: Subscription wird erstellt und an /api/push/subscribe gesendet", async () => {
    const { pushManager } = stubSupportedPushEnvironment({ permission: "granted" });
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await enablePushReminders("11111111-1111-4111-8111-111111111111", "Europe/Zurich");

    expect(result).toBe(true);
    expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/push/subscribe");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({
      uuid: "11111111-1111-4111-8111-111111111111",
      timezone: "Europe/Zurich",
      subscription: VALID_SUBSCRIPTION,
    });
    expect(getRemindersEnabled()).toBe(true);
  });

  it("denied: kein Subscribe-Aufruf, keine gesetzte Erinnerung – aber kein Fehler (Ablehnung ist gültig)", async () => {
    const { pushManager } = stubSupportedPushEnvironment({ permission: "denied" });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(enablePushReminders("22222222-2222-4222-8222-222222222222", "Europe/Zurich")).resolves.toBe(false);

    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getRemindersEnabled()).toBe(false);
  });

  it("API nicht vorhanden (z. B. iOS-Tab): kein Aufruf, kein Fehler", async () => {
    // Absichtlich NICHT stubSupportedPushEnvironment – im Standard-Testumfeld existieren
    // weder window noch Notification/PushManager, genau wie in einem iOS-Browser-Tab.
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(isPushSupported()).toBe(false);
    await expect(enablePushReminders("33333333-3333-4333-8333-333333333333", "Europe/Zurich")).resolves.toBe(false);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("granted, aber ohne konfigurierten VAPID-Public-Key: bricht sauber ab statt zu werfen", async () => {
    const { pushManager } = stubSupportedPushEnvironment({ permission: "granted" });
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(enablePushReminders("44444444-4444-4444-8444-444444444444", "Europe/Zurich")).resolves.toBe(false);
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("disablePushReminders: löscht lokalen Zustand, unsubscribed clientseitig und ruft /api/push/unsubscribe", async () => {
    const { pushManager, mockSubscription } = stubSupportedPushEnvironment({ permission: "granted" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
    await enablePushReminders("55555555-5555-4555-8555-555555555555", "Europe/Zurich");
    expect(getRemindersEnabled()).toBe(true);

    const unsubscribeFetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", unsubscribeFetch);

    await disablePushReminders("55555555-5555-4555-8555-555555555555");

    expect(getRemindersEnabled()).toBe(false);
    expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(unsubscribeFetch).toHaveBeenCalledWith(
      "/api/push/unsubscribe",
      expect.objectContaining({ method: "POST" }),
    );
    void pushManager;
  });

  it("syncSubscriptionTimezone: sendet die neue Zeitzone nur, wenn Erinnerungen aktiv sind", async () => {
    stubSupportedPushEnvironment({ permission: "granted" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
    await enablePushReminders("66666666-6666-4666-8666-666666666666", "Europe/Zurich");

    const syncFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", syncFetch);

    await syncSubscriptionTimezone("66666666-6666-4666-8666-666666666666", "Asia/Bangkok");

    expect(syncFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((syncFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.timezone).toBe("Asia/Bangkok");
  });

  it("syncSubscriptionTimezone: tut nichts, wenn Erinnerungen nicht aktiviert sind", async () => {
    stubSupportedPushEnvironment({ permission: "default" });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await syncSubscriptionTimezone("77777777-7777-4777-8777-777777777777", "Asia/Bangkok");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getNotificationPermissionState", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("liefert 'unsupported', wenn die Notification-API fehlt", () => {
    expect(getNotificationPermissionState()).toBe("unsupported");
  });

  it("liefert den Browser-Berechtigungsstatus, wenn verfügbar", () => {
    vi.stubGlobal("Notification", { permission: "denied" });
    expect(getNotificationPermissionState()).toBe("denied");
  });
});
