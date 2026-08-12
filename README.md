# Lunara

Minimalistische Web-App für den nächsten Vollmond-Countdown und die
Ferienplanung ohne Vollmond-Risiko. Die Mond-/Zeitzonen-Logik läuft
vollständig client-seitig (`astronomy-engine`); die einzige
Backend-Ausnahme sind fünf Serverless-Routen für einen anonymen
Aktivierungszähler und den Versand optionaler Vollmond-Erinnerungen
(siehe [Datenbank (Neon)](#datenbank-neon) und
[Push-Erinnerungen](#push-erinnerungen)). Keine Cookies, kein Tracking
darüber hinaus, keine Analytics. Details siehe [SPEC.md](./SPEC.md).

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
npm test         # Vitest (lib/moon.ts, lib/timezone.ts, lib/activation.ts, lib/onboarding.ts, lib/push.ts, lib/reminder.ts, lib/admin.ts)
npm run db:setup # Legt/aktualisiert die Tabellen an (idempotent)
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

Fünf Serverless-Routen (`/api/activate`, `/api/stats`, `/api/push/subscribe`,
`/api/push/unsubscribe`, `/api/cron/notify`) zählen anonyme App-Aktivierungen
und verwalten Push-Subscriptions in einer Neon-Postgres-Datenbank (Vercel
Marketplace, `@neondatabase/serverless`). Für die Aktivierung werden nur eine
zufällige UUID, Zeitstempel und eine grobe Plattform (`ios`/`android`/`other`)
gespeichert – keine Personendaten, keine IP-Adressen.

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

**`GET /api/stats`** liefert `{ total, last7days, weekly, platforms,
pushSubscriptions }` – nur mit gültigem `x-admin-token`-Header (siehe
[Admin-Statistik](#admin-statistik)):

```bash
curl -H "x-admin-token: $ADMIN_SECRET" https://<deployment-url>/api/stats
```

## Admin-Statistik

Rein für die Betreiberin gedachte Zusatzansicht (SPEC.md §2.7) auf die
bereits gespeicherten, anonymen Aktivierungszahlen – keine zusätzliche
Datenerhebung, kein Einfluss auf die App für andere Nutzerinnen.

**Setup:**

1. Zufälliges Secret erzeugen und als `ADMIN_SECRET` in den
   Vercel-Projekteinstellungen eintragen (**kein** `NEXT_PUBLIC_`-Prefix –
   das Secret darf nie an den Browser ausgeliefert werden). Danach lokal
   laden: `vercel env pull .env.local`.
2. Einmal `https://<deployment-url>/?admin=<ADMIN_SECRET>` öffnen (in
   Chrome/Safari oder direkt in der installierten App). Der Token wird
   nach `localStorage` übernommen und sofort wieder aus der Adresszeile
   entfernt.
3. Ab dann erscheint unten in der Planung-View dauerhaft eine
   Admin-Statistik-Sektion – auch nach Reload, geräteweit gültig, bis
   `localStorage` gelöscht wird oder der Server den Token ablehnt.

Der Browser prüft den Token nicht selbst; jede Anfrage an `/api/stats`
wird serverseitig gegen `ADMIN_SECRET` geprüft. Ein abgelehnter Token
(401) wird lokal sofort verworfen, ein vorübergehender Fehler
(Datenbank/Netzwerk) behält ihn und zeigt die Sektion einfach ohne Zahlen.

## Push-Erinnerungen

Beim Aktivieren fragt die App (ausser im iOS-Browser-Tab, dort erst nach der
Installation über die Erinnerungs-Sektion in der Planung-View) nach der
Benachrichtigungs-Berechtigung für Vollmond-Erinnerungen. Ein täglicher
Vercel-Cron-Job verschickt darauf 7 und 3 Tage vor jedem Vollmond eine
Push-Nachricht (`web-push`-Standard, VAPID-Schlüsselpaar).

**Setup** (einmalig, lokal bereits erledigt – siehe `.env.local`):

```bash
npx web-push generate-vapid-keys
```

Benötigte Umgebungsvariablen:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` – öffentlich, wird an den Browser ausgeliefert
- `VAPID_PUBLIC_KEY` – derselbe Schlüssel, serverseitig ohne `NEXT_PUBLIC_`-Prefix
  für den `web-push`-Versand im Cron-Job
- `VAPID_PRIVATE_KEY` – geheim, signiert die Push-Nachrichten
- `VAPID_SUBJECT` – Kontaktadresse lt. VAPID-Spezifikation, z. B.
  `mailto:name@example.com`
- `CRON_SECRET` – zufälliges Secret; schützt `/api/cron/notify` vor fremden
  Aufrufen (Vercel setzt bei gesetzter Env-Var automatisch den passenden
  `Authorization: Bearer`-Header, wenn der Cron-Job ausgelöst wird)

Für Vercel-Deployments alle fünf Variablen zusätzlich im Projekt-Dashboard
unter **Settings → Environment Variables** eintragen (werden nicht
automatisch aus `.env.local` übernommen). Der Zeitplan steht in
`vercel.json` (täglich `0 9 * * *`); die Tabellen inkl. `last_notified_at`
legt `npm run db:setup` an.

**Manuell testen:**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<deployment-url>/api/cron/notify
```

Liefert `{ ok: true, sent, skipped, removed }`. Ohne (oder mit falschem)
Header antwortet die Route mit `401`.

## PWA

Die App ist als Progressive Web App installierbar (Homescreen-Icon) und
funktioniert nach dem ersten Laden offline (Service Worker unter
`public/sw.js`, App-Icons werden zur Build-Zeit aus derselben
Mondphasen-Geometrie wie `components/Moon.tsx` generiert).
