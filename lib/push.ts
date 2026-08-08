import type { Platform } from "./activation";

// Web-Push-Erinnerungen (7 und 3 Tage vor Vollmond) – Erweiterung von Block 3
// des Onboardings (SPEC.md §2.5) sowie der Erinnerungs-Sektion in der
// Planung-View. Ablehnung ist ein gültiger Ausgang: alle Funktionen hier
// werfen nie, die Nutzerin wird nie blockiert.

const REMINDERS_STORAGE_KEY = "lunara:push-reminders-enabled";
const SEND_TIMEOUT_MS = 5000;

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Reine Struktur-Validierung – auch serverseitig nutzbar (keine Browser-APIs). */
export function isValidPushSubscription(value: unknown): value is PushSubscriptionPayload {
  if (typeof value !== "object" || value === null) return false;
  const subscription = value as Record<string, unknown>;
  if (typeof subscription.endpoint !== "string" || subscription.endpoint.length === 0) return false;
  if (typeof subscription.keys !== "object" || subscription.keys === null) return false;
  const keys = subscription.keys as Record<string, unknown>;
  return (
    typeof keys.p256dh === "string" && keys.p256dh.length > 0 && typeof keys.auth === "string" && keys.auth.length > 0
  );
}

export function isPushSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof PushManager !== "undefined" &&
    typeof Notification !== "undefined"
  );
}

/** Erkennt, ob die App bereits installiert (standalone) läuft statt im Browser-Tab. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
}

/**
 * iOS unterstützt Web Push nur im installierten (standalone) Zustand, nie im
 * Browser-Tab – dort daher gar nicht erst nach der Berechtigung fragen.
 * Android/Desktop und bereits installiertes iOS verhalten sich gleich.
 */
export function shouldOfferPushPrompt(platform: Platform): boolean {
  if (platform === "ios") return isStandaloneDisplay();
  return true;
}

export function getNotificationPermissionState(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

function isLocalStorageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

export function getRemindersEnabled(): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    return localStorage.getItem(REMINDERS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function setRemindersEnabled(enabled: boolean): void {
  if (!isLocalStorageAvailable()) return;
  try {
    if (enabled) {
      localStorage.setItem(REMINDERS_STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(REMINDERS_STORAGE_KEY);
    }
  } catch {
    // localStorage kann z. B. im privaten Modus fehlschlagen – Zustand bleibt dann nur für die Sitzung aktiv.
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

async function sendSubscription(uuid: string, timezone: string, subscription: PushSubscriptionPayload): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uuid, timezone, subscription }),
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fragt die Benachrichtigungs-Berechtigung an und erstellt bei Zusage eine
 * Push-Subscription. Gibt bei jedem Nicht-Erfolg (Ablehnung, fehlende
 * Unterstützung, Netzwerkfehler) false zurück, statt zu werfen – Ablehnung
 * ist ein gültiger Ausgang, kein Hinweis, kein Nag.
 */
export async function enablePushReminders(uuid: string, timezone: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const ok = await sendSubscription(uuid, timezone, subscription.toJSON() as PushSubscriptionPayload);
    if (ok) setRemindersEnabled(true);
    return ok;
  } catch {
    return false;
  }
}

/** Schaltet Erinnerungen aus: löscht die Subscription server- und clientseitig, räumt lokalen Zustand auf. */
export async function disablePushReminders(uuid: string): Promise<void> {
  setRemindersEnabled(false);

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } catch {
    // Best effort – lokaler Zustand ist bereits zurückgesetzt.
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uuid }),
      signal: controller.signal,
    });
  } catch {
    // Best effort – kein Retry-Mechanismus nötig, die serverseitige Zeile wird schlicht nicht mehr beliefert.
  } finally {
    clearTimeout(timeout);
  }
}

/** Hält die serverseitig gespeicherte Zeitzone bei einem Zonenwechsel aktuell, ohne erneut zu fragen. */
export async function syncSubscriptionTimezone(uuid: string, timezone: string): Promise<void> {
  if (!getRemindersEnabled() || !isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await sendSubscription(uuid, timezone, subscription.toJSON() as PushSubscriptionPayload);
  } catch {
    // Best effort.
  }
}
