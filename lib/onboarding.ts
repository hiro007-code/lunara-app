import { PLATFORMS, type Platform } from "./activation";

// Aktivierungs-Zustandslogik + Plattform-Erkennung fürs Onboarding (SPEC.md §2.5).
// Die Nutzerin wird nie blockiert: Aktivierung schliesst immer sofort lokal ab,
// der Server-Sync wird bei Fehlschlag beim nächsten App-Start nachgeholt.

const ACTIVATION_STORAGE_KEY = "lunara:activation";

type ActivationRecord = {
  uuid: string;
  platform: Platform;
  /** true, sobald POST /api/activate erfolgreich war. */
  synced: boolean;
};

export type ActivationState = "new" | "activated" | "pending-sync";

function isLocalStorageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

/** Grobe Plattform-Erkennung via User-Agent (SPEC.md §2.5, Block 2). */
export function detectPlatform(userAgent: string): Platform {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}

function isActivationRecord(value: unknown): value is ActivationRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.uuid === "string" &&
    typeof record.synced === "boolean" &&
    typeof record.platform === "string" &&
    (PLATFORMS as readonly string[]).includes(record.platform)
  );
}

function readActivationRecord(): ActivationRecord | null {
  if (!isLocalStorageAvailable()) return null;
  try {
    const raw = localStorage.getItem(ACTIVATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isActivationRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeActivationRecord(record: ActivationRecord): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(ACTIVATION_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // localStorage kann z. B. im privaten Modus fehlschlagen – Aktivierung bleibt dann nur für die Sitzung aktiv.
  }
}

/** "new": Onboarding zeigen. "activated": direkt in die App. "pending-sync": in die App, Sync im Hintergrund nachholen. */
export function getActivationState(): ActivationState {
  const record = readActivationRecord();
  if (!record) return "new";
  return record.synced ? "activated" : "pending-sync";
}

export function getStoredActivation(): { uuid: string; platform: Platform } | null {
  const record = readActivationRecord();
  return record ? { uuid: record.uuid, platform: record.platform } : null;
}

const SEND_TIMEOUT_MS = 5000;

/**
 * Sendet die Aktivierung ans Backend; gibt bei jedem Fehler (offline, API down, Timeout, ...)
 * false zurück, statt zu werfen – die Nutzerin darf nie blockiert werden.
 */
export async function sendActivation(uuid: string, platform: Platform): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const response = await fetch("/api/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uuid, platform }),
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
 * Schliesst die Aktivierung ab (Block 3): erzeugt eine UUID, versucht den Server-Sync,
 * schliesst aber in jedem Fall lokal ab – bei Fehlschlag greift retryPendingSync() später.
 */
export async function activate(platform: Platform): Promise<void> {
  const uuid = crypto.randomUUID();
  const synced = await sendActivation(uuid, platform);
  writeActivationRecord({ uuid, platform, synced });
}

/** Holt einen fehlgeschlagenen Server-Sync nach, falls einer aussteht (Retry-Fall). */
export async function retryPendingSync(): Promise<void> {
  const record = readActivationRecord();
  if (!record || record.synced) return;
  const synced = await sendActivation(record.uuid, record.platform);
  if (synced) {
    writeActivationRecord({ ...record, synced: true });
  }
}
