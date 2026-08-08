# Lunara

Minimalistische Web-App für den nächsten Vollmond-Countdown und die
Ferienplanung ohne Vollmond-Risiko. Alles läuft rein client-seitig
(`astronomy-engine`), es gibt kein Backend, keine Datenbank, keine Cookies
und kein Tracking. Details siehe [SPEC.md](./SPEC.md).

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
npm test         # Vitest (lib/moon.ts, lib/timezone.ts)
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

## PWA

Die App ist als Progressive Web App installierbar (Homescreen-Icon) und
funktioniert nach dem ersten Laden offline (Service Worker unter
`public/sw.js`, App-Icons werden zur Build-Zeit aus derselben
Mondphasen-Geometrie wie `components/Moon.tsx` generiert).
