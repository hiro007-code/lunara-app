# Lunara – Vollmond-Countdown & Ferienplanung

> **Lastenheft / Projekt-Spezifikation** – Referenzdokument für alle Claude-Code-Prompts.
> Bei Prompts referenzieren mit: *"Halte dich an SPEC.md"*. Änderungen an Anforderungen werden zuerst hier dokumentiert, dann umgesetzt.

---

## 1. Zweck & Kontext

Eine minimalistische Web-App für eine Familie mit Zwillingen (3 J.), die auf Vollmond sensibel reagieren. Die App zeigt, wann der nächste Vollmond kommt und hilft, Ferien so zu planen, dass sie nicht in eine Vollmondphase fallen.

**Nutzerin:** Eine Person (die Schwester), mobile Nutzung im Vordergrund (Smartphone, Homescreen-Icon).

**Kernversprechen:** Auf einen Blick sehen, wie lange es bis zum nächsten Vollmond dauert – und Reisedaten in Sekunden auf "Vollmond-Gefahr" prüfen.

---

## 2. Features

### 2.1 View "Mond" (Startscreen / Countdown)

- Grosses Mond-Visual, zentriert, mit korrekt berechneter aktueller Beleuchtungsphase (SVG/CSS, **keine Bilder**)
- Primärtext: **"Vollmond in X Tagen"** (gross)
- Sekundärtext: "Letzter Vollmond vor X Tagen" (klein, darunter)
- Bei X ≤ 1: Anzeige in Stunden bzw. "Heute Nacht"
- Aktive Zeitzone oben rechts sichtbar (z. B. "Zürich"), antippbar → öffnet Zeitzonen-Auswahl
- Keine weiteren Bedienelemente auf diesem Screen

### 2.2 View "Planung"

**a) Jahresübersicht**
- Liste aller Vollmonde der nächsten **18 Monate**
- Pro Eintrag: Datum, Wochentag, Uhrzeit (in gewählter Zeitzone)
- Gefahrenzone **±2 Tage** um jeden Vollmond visuell markiert (dezentes Amber)
- Vergangene Vollmonde des laufenden Monats optional ausgegraut sichtbar

**b) Datums-Check (Reise-Ampel)**
- Eingabe: Startdatum + Enddatum (Reisezeitraum), optional Ziel-Zeitzone
- Ausgabe als Ampel:
  - 🟢 **Grün:** kein Vollmond und keine Gefahrenzone im Zeitraum
  - 🟡 **Gelb:** Gefahrenzone (±2 Tage) berührt den Zeitraum, aber kein Vollmond-Tag
  - 🔴 **Rot:** mindestens ein Vollmond-Tag liegt im Zeitraum
- Bei Gelb/Rot: betroffene Daten konkret nennen ("Vollmond am 14. Okt")

### 2.3 Zeitzonen-Wahl

- IANA-Zeitzonen, Auswahl per durchsuchbarem Dropdown (Städte/Regionen)
- Standard: `Europe/Zurich`
- Bis zu 4 Favoriten speicherbar (z. B. "Zuhause", "Ferienziel") – Persistenz via `localStorage`
- Wichtig: Der Vollmond ist ein globales Ereignis; die Zeitzone ändert nur die lokale Uhrzeit/Datumszuordnung, nicht den Zeitpunkt selbst

### 2.4 Nice-to-have (nur nach expliziter Freigabe umsetzen)

- Ziel-Zeitzone direkt im Datums-Check wählbar
- Dezente Mond-Textur (SVG-Filter/Noise)
- Teilen-Funktion für Check-Ergebnis

### 2.5 Onboarding & Aktivierung

- Einmaliger Onboarding-Screen vor der eigentlichen App, solange in `localStorage` keine Aktivierung vorliegt; danach nie wieder (direkter Sprung in die App)
- Gestaltung exakt in der bestehenden Designsprache (§5): Nachthimmel, Mond-SVG klein als Logo, ruhige Typografie
- **Block 1 – Worum geht's:** 2–3 Sätze auf Deutsch, was die App tut und für wen (Familien, deren Kinder sensibel auf Vollmond reagieren; Ferien/Termine mondfrei planen)
- **Block 2 – Installation:** Plattform-Erkennung via User-Agent. Android/Chrome: Menüweg beschrieben, zusätzlich `beforeinstallprompt` abfangen und bei Verfügbarkeit einen echten "App installieren"-Button (nativer Dialog) zeigen. iOS: Teilen-Symbol → Zum Home-Bildschirm hinzufügen (geht in Safari und Chrome). Desktop/unbekannt: neutrale Kurzfassung beider Wege. Symbole als Inline-SVG, keine Screenshots
- **Block 3 – Aktivieren:** grosser, primärer Button. Erzeugt eine zufällige UUID, bestimmt die Plattform grob (`ios`/`android`/`other`), sendet beides an `/api/activate`, speichert UUID + Aktivierungs-Flag lokal, blendet weich zur App über
- Fehlerfall (offline/API down): Aktivierung schliesst trotzdem lokal ab, die Nutzerin wird nie blockiert; Nachsenden einmalig beim nächsten App-Start mit Netz (Retry-Flag in `localStorage`)
- Datenschutz-Einzeiler unter dem Button: anonyme Zufalls-ID, keine Personendaten
- Dezenter "Über diese App"-Link unten in der Planung-View öffnet jederzeit erneut ein ruhiges Sheet (Stil wie Zeitzonen-Picker) mit dem "Worum geht's"-Text und dem Datenschutz-Hinweis

**Push-Erinnerungen (Erweiterung von Block 3):**
- Zwischen Installations-Anleitung und Aktivieren-Button ein kurzer Absatz, der ankündigt, dass beim Aktivieren nach der Benachrichtigungs-Berechtigung gefragt wird (7 und 3 Tage vor Vollmond) und dass eine Ablehnung die App nicht einschränkt
- Android/Desktop und bereits installiertes iOS (standalone): direkt nach der Aktivierungslogik `Notification.requestPermission()` anfragen. `granted` → Push-Subscription erstellen, an `/api/push/subscribe` senden (mit aktiver Zeitzone), lokalen Erinnerungs-Zustand aktiv setzen. `denied`/`default` → kommentarlos weiter zur App, kein Hinweis, kein Nag
- iOS im Browser-Tab (nicht installiert): keine Permission-Anfrage versuchen (Web Push funktioniert dort ohnehin nicht); Absatz weist stattdessen auf die Erinnerungs-Sektion in der Planung-View nach der Installation hin
- Der Übergang zur App hängt nie an der Permission-Abfrage oder am Server-Sync der Subscription (gleiche Nie-blockieren-Garantie wie bei der Aktivierung)
- Erinnerungs-Sektion in der Planung-View: Toggle "Erinnerungen 7 und 3 Tage vor Vollmond", spiegelt den Zustand aus dem Onboarding, erlaubt nachträgliches Ein-/Ausschalten (Aus → `/api/push/unsubscribe` + lokalen Zustand löschen); zeigt einen Hinweis, wenn die Berechtigung bereits verweigert wurde oder auf iOS die Installation fehlt; ein Zeitzonen-Wechsel aktualisiert eine aktive Subscription automatisch, ohne erneut zu fragen

### 2.6 Vollmond-Erinnerungen: Versand

- Täglicher Cron-Job (`app/api/cron/notify`, via Vercel Cron `vercel.json`, `0 9 * * *`) prüft alle gespeicherten Push-Subscriptions
- Pro Subscription wird der heutige Kalendertag in **deren** gespeicherter Zeitzone bestimmt und mit dem Kalendertag des nächsten Vollmonds (ebenfalls in dieser Zeitzone berechnet) verglichen; bei einer Differenz von exakt 7 oder exakt 3 Tagen wird eine Push-Nachricht verschickt (Titel "Lunara", Text z. B. "Vollmond in 7 Tagen – 28. Aug")
- Doppelsendungs-Schutz: `push_subscriptions.last_notified_at` wird nach jedem Versand gesetzt; eine Subscription wird pro Kalendertag (in ihrer Zeitzone) höchstens einmal benachrichtigt
- `push_subscriptions.uuid` referenziert `activations.uuid` als Fremdschlüssel (bereits seit §2.5 so angelegt): eine Subscription kann nur zu einer bestehenden Aktivierung gehören. Konsequenz: **ohne Aktivierung keine Erinnerung** – das Abonnieren (Block 3) läuft immer erst nach der Aktivierungslogik, nie davor oder unabhängig davon
- Vom Push-Dienst als ungültig gemeldete Subscriptions (HTTP 404/410, z. B. abgemeldetes Gerät) werden automatisch aus der Datenbank entfernt
- Der Cron-Endpunkt akzeptiert ausschliesslich Aufrufe mit `Authorization: Bearer $CRON_SECRET` (von Vercel Cron bei gesetztem `CRON_SECRET` automatisch mitgeschickt); alle anderen Anfragen erhalten 401

### 2.7 Admin-Statistik

- Rein für die Betreiberin gedachte, token-geschützte Zusatzansicht auf die bereits über den anonymen Aktivierungszähler (§2.5) gespeicherten Daten – keine neue Datenerhebung, kein Einfluss auf Onboarding, Aktivierung oder Erinnerungen für andere Nutzerinnen
- Zugriff: einmaliges Öffnen von `/?admin=<ADMIN_SECRET>` (auf einer beliebigen Seite) übernimmt den Token in `localStorage` und entfernt ihn sofort wieder aus der Adresszeile (`history.replaceState`, andere Query-Parameter bleiben erhalten); ab dann bleibt der Admin-Bereich auf diesem Gerät dauerhaft sichtbar – auch nach Reload und in der installierten App
- Der Client validiert den Token nicht selbst – Prüfung ausschliesslich serverseitig bei jedem Aufruf von `GET /api/stats` gegen `ADMIN_SECRET` (Header `x-admin-token`); fehlender oder falscher Token liefert `401`, ohne konfiguriertes `ADMIN_SECRET` ist die Route für niemanden erreichbar
- Ein vom Server abgelehnter Token (401) wird im Client sofort verworfen (lokal gelöscht) und zeigt einen dezenten Fehlerhinweis statt der Zahlen; ein vorübergehender Fehler (Datenbank/Netzwerk) behält den Token, zeigt aber ebenfalls keine Zahlen
- Anzeige: eigene, ruhige Sektion (Stil §5) unten in der Planung-View, nur bei vorhandenem Token sichtbar – Aktivierungen gesamt, letzte 7 Tage, Verteilung nach Plattform, Anzahl Push-Abos; bewusst ohne Wochenverlauf oder sonstige Verlaufsdarstellung, damit das Panel ohne Scrollen auf einen Blick erfassbar bleibt (Etappe 9.2)

---

## 3. Fachliche Logik: Mondberechnung

- **Library:** `astronomy-engine` (npm) – präzise, offline, keine API
- Berechnung vollständig **client-side**; kein Backend, keine Datenbank, keine externen API-Calls
- Benötigte Funktionen:
  - Nächster Vollmond ab jetzt (Zeitpunkt in UTC)
  - Letzter Vollmond vor jetzt
  - Alle Vollmonde in einem Zeitraum (18 Monate voraus)
  - Aktuelle Mondphase / Beleuchtungsgrad (0–1) fürs Visual
- Alle Zeitpunkte intern in **UTC** halten; Umrechnung in Anzeige-Zeitzone erst beim Rendern via `Intl.DateTimeFormat` / `date-fns-tz`
- **Gefahrenzone:** Kalendertage in der gewählten Zeitzone: Vollmond-Tag ±2 Tage (insgesamt 5 Tage)
- Randfall beachten: Vollmond nahe Mitternacht kann je nach Zeitzone auf ein anderes Datum fallen – deshalb Datumszuordnung immer erst nach Zeitzonen-Umrechnung

---

## 4. Tech-Stack

| Bereich | Entscheidung |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Hosting | Vercel |
| Styling | Tailwind CSS |
| Mondberechnung | `astronomy-engine` |
| Zeitzonen | `Intl.DateTimeFormat` (+ ggf. `date-fns` / `date-fns-tz`) |
| State/Persistenz | React State + Context (aktive Zeitzone) + `localStorage` (Zeitzonen-Favoriten) |
| Backend/DB | Grundsätzlich **keins**; Backend-Ausnahme: fünf Serverless-Routen (`/api/activate`, `/api/stats`, `/api/push/subscribe`, `/api/push/unsubscribe`, `/api/cron/notify`) mit Neon Postgres (Vercel Marketplace, `@neondatabase/serverless`). Zweck: anonymer Aktivierungszähler sowie Speicherung/Versand von Push-Subscriptions für Vollmond-Erinnerungen. Tabellen (inkl. `last_notified_at`) per `scripts/setup-db.ts` (`npm run db:setup`) |
| Admin-Statistik | `GET /api/stats` (§2.7) nur mit gültigem Header `x-admin-token`, serverseitig geprüft gegen `ADMIN_SECRET` (nur Server, **kein** `NEXT_PUBLIC_`-Prefix). Client übernimmt den Token einmalig aus `/?admin=...` nach `localStorage`, validiert ihn aber nicht selbst |
| Push-Benachrichtigungen | Web Push (Browser-Standard): Client nutzt `PushManager`/`Notification` zum Abonnieren, Server nutzt `web-push` (Laufzeit-Abhängigkeit, Versand im Cron-Job) zum Senden. VAPID-Schlüsselpaar einmalig per `npx web-push generate-vapid-keys` generiert – Client `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, Server `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` (mailto-Kontakt lt. VAPID-Spezifikation) |
| Scheduling | Vercel Cron (`vercel.json`, täglich `0 9 * * *`) ruft `/api/cron/notify` auf; Absicherung via `CRON_SECRET` (von Vercel bei gesetzter Env-Var automatisch als `Authorization: Bearer`-Header mitgeschickt) |
| PWA | Manifest (`app/manifest.ts`) + generierte Icons (`next/og`, konsistent mit `Moon.tsx`), damit Homescreen-Installation möglich; offline-fähig via handgeschriebenem Service Worker (`public/sw.js`) |
| Tests | `vitest` (einzige Ausnahme zu "keine zusätzlichen Libraries", da im Projekt kein Test-Runner vorhanden war; nur als `devDependency`, kein Einfluss auf den Produktions-Build) |

---

## 5. Design

### 5.1 Grundhaltung

Beruhigend, dunkel, völlig minimalistisch. Die App soll sich anfühlen wie ein Blick in den Nachthimmel – nicht wie ein Dashboard.

### 5.2 Farben

- Hintergrund: sehr dunkles Blau-Schwarz (Nachthimmel, **nicht** reines Schwarz), z. B. `#0A0E1A`-Richtung
- Mond & Primärtext: warmes Off-White
- Sekundärtext: gedämpftes Silber/Grau
- Gefahrenzone & Warnungen: sanftes Amber (`--amber: #c99b5e`) – **kein grelles Rot**
- Grün der Ampel: gedämpftes, ruhiges Grün (`--green: #7fa98e`)
- "Rote" Ampel: eigener gedämpfter Warm-Rot-Ton `--danger: #c2705a` (unterscheidbar von Amber, aber bewusst kein grelles Rot)

### 5.3 Typografie & Layout

- Schrift: Inter oder Geist
- Grosse Zahlen beim Countdown, sonst zurückhaltend; viel Weissraum
- Subtile Sterne im Hintergrund erlaubt (reines CSS, sehr dezent, keine Animation-Spielerei)
- Mobile-first; Desktop = zentrierte, schmale Spalte

### 5.4 Navigation

- **Bottom Bar** mit genau 2 Tabs: **Mond** | **Planung**
- Zeitzonen-Wahl ist **kein** Tab, sondern dezentes Element oben rechts
- Keine weiteren Menüs, keine Settings-Seite im MVP

### 5.5 Explizite Nicht-Ziele (Design)

- Keine Fotos/Bilder, keine Illustrations-Assets
- Kein mehrschrittiges Onboarding (Tutorials, Tours), keine Popups – Ausnahme: der einmalige Aktivierungs-/Install-Screen aus §2.5
- Keine Farbverläufe-Orgien, keine Glassmorphism-Effekte

---

## 6. Projektstruktur (Vorschlag)

```
/app
  /page.tsx            → View "Mond" (Countdown)
  /planung/page.tsx    → View "Planung"
  /layout.tsx          → Shell inkl. Bottom Bar
/components
  Moon.tsx             → SVG-Mond mit Phasen-Rendering
  Countdown.tsx
  FullMoonList.tsx     → Jahresübersicht
  DateCheck.tsx        → Reise-Ampel
  TimezonePicker.tsx
  BottomBar.tsx
/lib
  moon.ts              → Wrapper um astronomy-engine (alle Berechnungen)
  timezone.ts          → Zeitzonen-Helpers, Favoriten (localStorage)
```

---

## 7. Qualitätsanforderungen

- Sprache der UI: **Deutsch** (Schweiz-tauglich, aber ß-frei ist ohnehin Standard hier: "gross" statt "groß" nicht nötig in UI-Texten – neutrale Formulierungen bevorzugen)
- Ladezeit: instant, kein Spinner nötig (alles client-side berechenbar)
- Funktioniert offline nach erstem Laden (PWA); Service Worker (`public/sw.js`) liefert Navigationen network-first: eine bereits installierte App bekommt bei jedem Öffnen mit Netzverbindung automatisch den aktuellen Deploy-Stand, nur ohne Netz greift der zuletzt gecachte Stand. Bei Änderungen an der Cache-Struktur muss `CACHE_VERSION` erhöht werden, sonst bleiben installierte Clients auf altem Cache-Inhalt hängen
- Keine Cookies, kein Tracking ausser einem anonymen Aktivierungszähler (zufällige UUID, Zeitstempel, grobe Plattform ios/android/other – keine Personendaten, keine IP-Speicherung, keine weiteren Pings), keine Analytics
- Die Admin-Statistik (§2.7) erhebt keine zusätzlichen Daten – reine, token-geschützte Ansicht der bereits gespeicherten anonymen Aktivierungszahlen für die Betreiberin, ohne Wirkung auf App-Verhalten oder Datenschutz für andere Nutzerinnen
- Tests für `lib/moon.ts`: mindestens die Randfälle (Vollmond nahe Mitternacht, Zeitzonen-Datumskippen, Zeitraum-Ampel-Logik)
- Erinnerungs-Versand: höchstens eine Push-Benachrichtigung pro Subscription und Kalendertag (Doppelsendungs-Schutz, §2.6); vom Push-Dienst als ungültig gemeldete Subscriptions werden automatisch entfernt statt bei jedem Cron-Lauf erneut zu scheitern

---

## 8. Roadmap / Etappen für Claude-Code-Prompts

1. **Setup:** Next.js + Tailwind + astronomy-engine, Projektstruktur gem. §6, Deploy-fähig auf Vercel
2. **Mond-Logik:** `lib/moon.ts` inkl. Tests (§3, §7)
3. **View Mond:** Countdown-Screen inkl. Mond-SVG (§2.1, §5)
4. **View Planung:** Jahresübersicht + Datums-Check (§2.2)
5. **Zeitzonen:** Picker + Favoriten (§2.3)
6. **Feinschliff:** PWA, Randfälle, Design-Polish
7. **Onboarding & Aktivierung:** Onboarding-Screen, Install-Anleitung, anonymer Aktivierungszähler via Neon Postgres (§2.5, §4, §7)
8. **Vollmond-Erinnerungen:** Push-Abo im Onboarding/in der Planung-View sowie täglicher Cron-Versand via `web-push` (§2.5, §2.6, §4, §7)
9. **Admin-Statistik:** Token-geschützte Zusatzansicht (`/?admin=...`, `ADMIN_SECRET`) in der Planung-View mit erweiterten Kennzahlen zu `/api/stats` (§2.7, §4, §7)

> Pro Prompt genau **eine** Etappe umsetzen. Immer auf dieses Dokument verweisen.

---

## 9. Änderungshistorie

| Datum | Änderung |
|---|---|
| 2026-08-07 | Initiale Version |
| 2026-08-08 | Etappen 1–6 umgesetzt: Setup, Mond-Logik (`lib/moon.ts`, `lib/timezone.ts`), View Mond, View Planung, Zeitzonen-Picker mit Favoriten, PWA (Manifest, generierte Icons, Service Worker) und Feinschliff (Fokus-Zustände, `prefers-reduced-motion`). `vitest` als Test-Runner (§4) und `--danger` als Ampel-Rot (§5.2) ergänzt. |
| 2026-08-08 | Etappe 7: Onboarding-Screen mit Install-Anleitung und anonymem Aktivierungszähler (§2.5). Backend-Ausnahme (§4): `/api/activate`, `/api/stats` mit Neon Postgres (Vercel Marketplace, `@neondatabase/serverless`). Tracking-Hinweis in §7 präzisiert. |
| 2026-08-08 | Push-Erinnerungen als Erweiterung von Block 3 (§2.5): Benachrichtigungs-Berechtigung beim Aktivieren (ausser iOS-Browser-Tab), Erinnerungs-Toggle in der Planung-View. Backend-Ausnahme (§4) um `/api/push/subscribe`/`/api/push/unsubscribe` sowie VAPID-Schlüsselpaar ergänzt. |
| 2026-08-08 | Etappe 8: Neuer §2.6 (Versand) – täglicher Cron-Job (`/api/cron/notify`, Vercel Cron) verschickt Vollmond-Erinnerungen 7/3 Tage vorher via `web-push`, mit Doppelsendungs-Schutz (`last_notified_at`) und automatischer Bereinigung ungültiger Subscriptions. `web-push` als Laufzeit-Abhängigkeit, `vercel.json` sowie `VAPID_PUBLIC_KEY`/`VAPID_SUBJECT`/`CRON_SECRET` in §4 ergänzt; §7 um die Versand-Qualitätsanforderungen erweitert. |
| 2026-08-12 | Etappe 9: Neuer §2.7 (Admin-Statistik) – `GET /api/stats` ist nicht mehr öffentlich, sondern nur noch mit Header `x-admin-token` gegen `ADMIN_SECRET` erreichbar, und liefert zusätzlich Wochenverlauf (12 Wochen), Plattform-Verteilung und Anzahl Push-Abos. Client übernimmt den Token einmalig aus `/?admin=...` nach `localStorage` (sofortige Entfernung aus der Adresszeile), validiert ihn aber nicht selbst; dezente Statistik-Sektion unten in der Planung-View, sichtbar nur mit gültigem Token. `ADMIN_SECRET` in §4 ergänzt; §7 um den Hinweis auf reine Ansicht ohne zusätzliche Datenerhebung erweitert. |
| 2026-08-12 | Etappe 9.1 (Bugfix): `public/sw.js` lieferte Navigationen bisher cache-first ohne jede Revalidierung aus und `CACHE_VERSION` wurde nie erhöht – Deployments (u. a. Etappe 9) erreichten bestehende Installationen dadurch nie von selbst. Navigationen (`request.mode === "navigate"`) laufen jetzt network-first (Fallback auf den Cache nur bei Netzfehler); alles andere (Build-Assets, Icons, Manifest) bleibt cache-first. `CACHE_VERSION` auf `lunara-v2` erhöht, damit der `activate`-Handler alte Caches einmalig bereinigt. §7 um das Update-Verhalten ergänzt. |
| 2026-08-12 | Etappe 9.2 (Refactor): Admin-Statistik (§2.7) verschlankt – der Wochenverlauf (12 Wochen, Balken) entfällt ersatzlos, `GET /api/stats` liefert nur noch `{ total, last7days, platforms, pushSubscriptions }`. Grund: Das Panel soll ohne Scrollen auf einen Blick erfassbar sein. |
