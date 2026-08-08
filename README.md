# Lunara

Minimalistische Web-App für den nächsten Vollmond-Countdown und die
Ferienplanung ohne Vollmond-Risiko. Die Mond-/Zeitzonen-Logik läuft
vollständig client-seitig (`astronomy-engine`); die einzige
Backend-Ausnahme sind zwei Serverless-Routen für einen anonymen
Aktivierungszähler (siehe [Datenbank (Neon)](#datenbank-neon)). Keine
Cookies, kein Tracking darüber hinaus, keine Analytics. Details siehe
[SPEC.md](./SPEC.md).

## Screens

- **Mond** – grosser Mond mit aktueller Beleuchtungsphase, Countdown bis zum
  nächsten Vollmond
- **Planung** – Datums-Check (Reise-Ampel) und Jahresübersicht der Vollmonde
  der nächsten 18 Monate

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server auf http://localhost:3000
npm run build    # Produktions-Build
npm run start    # Produktions-Build lokal servieren
npm test         # Vitest (lib/moon.ts, lib/timezone.ts, lib/activation.ts, lib/onboarding.ts)
npm run db:setup # Legt die Tabelle für den Aktivierungszähler an (idempotent)
```

Voraussetzung: Node.js 20+.

## Deployment (Vercel)

Das Projekt ist ein Standard-Next.js-App-Router-Projekt und braucht keine
Sonderkonfiguration:

```bash
vercel        # Preview-Deployment
vercel --prod # Produktions-Deployment
```

Alternativ das Repository unter [vercel.com/new](https://vercel.com/new)
importieren – Next.js wird automatisch erkannt.

## Datenbank (Neon)

Zwei Serverless-Routen (`/api/activate`, `/api/stats`) zählen anonyme
App-Aktivierungen in einer Neon-Postgres-Datenbank (Vercel Marketplace,
`@neondatabase/serverless`). Gespeichert werden nur eine zufällige UUID,
Zeitstempel und eine grobe Plattform (`ios`/`android`/`other`) – keine
Personendaten, keine IP-Adressen.

**Setup** (einmalig, für lokale Entwicklung):

1. Im Vercel-Dashboard des Projekts unter **Storage** eine Neon-Postgres-Datenbank
   anlegen (oder eine bestehende verbinden).
2. Umgebungsvariablen lokal laden:
   ```bash
   vercel env pull .env.local
   ```
   Das erzeugt u. a. `DATABASE_URL` in `.env.local` (wird nicht committet).
3. Tabelle anlegen (idempotent, kann gefahrlos mehrfach laufen):
   ```bash
   npm run db:setup
   ```

Ohne `DATABASE_URL` liefern beide Routen einen sauberen `503`-JSON-Fehler
statt zu crashen – Build und restliche App funktionieren auch ohne DB.

**`GET /api/stats`** liefert `{ total, last7days }` – nützlich, um die
Aktivierung schnell zu verifizieren:

```bash
curl https://<deployment-url>/api/stats
```

## PWA

Die App ist als Progressive Web App installierbar (Homescreen-Icon) und
funktioniert nach dem ersten Laden offline (Service Worker unter
`public/sw.js`, App-Icons werden zur Build-Zeit aus derselben
Mondphasen-Geometrie wie `components/Moon.tsx` generiert).
