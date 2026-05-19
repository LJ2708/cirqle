# cirqle ✦ run. meet. connect.

Website für den **cirqle Run Club** aus Hannover.

Live: _(noch nicht deployed)_
Instagram: [@lecirqle](https://instagram.com/lecirqle)

## Über

cirqle ist eine offene Lauf-Community in Hannover. Jeden Sonntag um 10 Uhr starten wir am CODOS und laufen 8,3 km um den Maschsee. Alle Paces willkommen. Kostenlos. Community first.

## Tech

- Single-File HTML mit allem inline (kein Build-Step nötig)
- **Three.js** für 3D-Hero und 3D-Strecke (Strava-Style)
- **GSAP + ScrollTrigger** für Scroll-Animationen
- **Lenis** für Smooth-Scrolling
- **opentype.js** für Live-SVG-Pfad-Generierung des Pacifico-Logos
- Dark/Light Theme mit Custom-Cursor und SEO-ready

## Lokal entwickeln

Einfach `index.html` im Browser öffnen — fertig.

Für Hot-Reload während Entwicklung optional:
```bash
npx serve .
```

## Inhalte aktualisieren

### Fotos austauschen
Drop deine Fotos in `photos/` mit den Namen `photo-1.jpg` bis `photo-10.jpg`. Optional `video-1.mp4` und `video-2.mp4`.

### Events anpassen
In `index.html` Section `<!-- EVENTS -->` → die 3 `.event-card` Blöcke. Datum, Treffpunkt, Pace und Voucher direkt im HTML editieren.

### Spotify-Playlist
In `index.html` nach `open.spotify.com/embed/playlist/` suchen — die ID dahinter durch eure echte Playlist-ID ersetzen.

### Strecke
Falls die Route mal geändert wird: in der `<script>` nach `const rawRoute = [` suchen — das sind die GPS-Koordinaten `[lat, lng]`. Aus Komoot/Strava exportieren und reinpacken.

## Deploy

Siehe `DEPLOY.md` für Schritt-für-Schritt-Anleitung.

Kurz: Push zu GitHub → in Vercel importieren → fertig. Jeder weitere Push deployed automatisch.

## Struktur

```
.
├── index.html        # Komplette Site (CSS + JS inline)
├── photos/           # Bild- und Video-Assets
│   ├── photo-1.jpg ... photo-10.jpg
│   └── video-1.mp4, video-2.mp4
├── DEPLOY.md         # Deployment-Anleitung
└── README.md         # Du bist hier
```

## License

© cirqle Hannover · Community First
