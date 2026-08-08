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
| State/Persistenz | React State + `localStorage` (Zeitzonen-Favoriten) |
| Backend/DB | **keins** – bewusst |
| PWA | Manifest + Icons, damit Homescreen-Installation möglich; offline-fähig |

---

## 5. Design

### 5.1 Grundhaltung

Beruhigend, dunkel, völlig minimalistisch. Die App soll sich anfühlen wie ein Blick in den Nachthimmel – nicht wie ein Dashboard.

### 5.2 Farben

- Hintergrund: sehr dunkles Blau-Schwarz (Nachthimmel, **nicht** reines Schwarz), z. B. `#0A0E1A`-Richtung
- Mond & Primärtext: warmes Off-White
- Sekundärtext: gedämpftes Silber/Grau
- Gefahrenzone & Warnungen: sanftes Amber – **kein grelles Rot** (auch die "rote" Ampel eher als gedämpftes Warm-Rot/Amber)
- Grün der Ampel: gedämpftes, ruhiges Grün

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
- Keine Onboarding-Screens, keine Popups
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
- Funktioniert offline nach erstem Laden (PWA)
- Keine Cookies, kein Tracking, keine Analytics
- Tests für `lib/moon.ts`: mindestens die Randfälle (Vollmond nahe Mitternacht, Zeitzonen-Datumskippen, Zeitraum-Ampel-Logik)

---

## 8. Roadmap / Etappen für Claude-Code-Prompts

1. **Setup:** Next.js + Tailwind + astronomy-engine, Projektstruktur gem. §6, Deploy-fähig auf Vercel
2. **Mond-Logik:** `lib/moon.ts` inkl. Tests (§3, §7)
3. **View Mond:** Countdown-Screen inkl. Mond-SVG (§2.1, §5)
4. **View Planung:** Jahresübersicht + Datums-Check (§2.2)
5. **Zeitzonen:** Picker + Favoriten (§2.3)
6. **Feinschliff:** PWA, Randfälle, Design-Polish

> Pro Prompt genau **eine** Etappe umsetzen. Immer auf dieses Dokument verweisen.

---

## 9. Änderungshistorie

| Datum | Änderung |
|---|---|
| 2026-08-07 | Initiale Version |
