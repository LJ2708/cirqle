# cirqle Run Club — Deployment Guide

## TL;DR — Schnellster Weg live (5 Minuten)

1. Geh auf **https://vercel.com/new**
2. Login mit GitHub/E-Mail (kostenlos)
3. Klick "Deploy" → wähl "Browse all templates" → scroll runter zu **"Other"** → "Import a third-party Git repository" überspringen
4. Stattdessen: Klick einfach auf das **Drag&Drop-Feld** (oder über "Deploy without Git")
5. Zieh den kompletten **`outputs/`** Ordner rein (mit `lecirqle.html` + `photos/` Ordner)
6. **Wichtig:** Benenne `lecirqle.html` vorher in `index.html` um (so dass Vercel es als Startseite erkennt)
7. Deploy → du kriegst eine URL wie `cirqle-abc123.vercel.app`

Fertig.

## Welche Variante läuft am besten?

| Anbieter | Geschwindigkeit | Setup-Aufwand | Free-Tier |
|----------|----------------|---------------|-----------|
| **Vercel** ⭐ | sehr schnell (Edge Network) | minimal | großzügig, mehr als ihr je brauchen werdet |
| **Cloudflare Pages** | schnellster Edge weltweit | mittel | unlimited bandwidth |
| **Netlify** | schnell | minimal | gut |

**Meine Empfehlung: Vercel.** Beste DX, schnellster Edge in Deutschland, Custom-Domain-Anbindung ist 2 Klicks. Cloudflare Pages wäre minimal schneller in absoluten Zahlen, aber der Unterschied ist für eure Use-Case (statische HTML mit ein paar Animationen) nicht spürbar.

## Wichtige Vorbereitungen vor dem Deploy

### 1. `lecirqle.html` → `index.html` umbenennen
Vercel/Netlify suchen automatisch nach `index.html`. Sonst musst du jedes Mal den Dateinamen in der URL angeben.

### 2. Fotos in `photos/` Ordner
Die Site sucht automatisch nach `photos/photo-1.jpg` bis `photos/photo-10.jpg` plus `video-1.mp4`, `video-2.mp4`. Solange diese Dateien fehlen, zeigt die Site Pink-Glow-Platzhalter.

**Empfohlene Größen:**
- Fotos: max 1600px Breite, als `.webp` oder `.jpg` (qualität 80–85)
- Videos: max 1280×720, als `.mp4` mit H.264, möglichst unter 5 MB

Tipp: Falls du viele große JPGs hast, lass sie einmal durch [squoosh.app](https://squoosh.app) — kannst Mengen-konvertieren und 70–80% Größe sparen ohne sichtbaren Qualitätsverlust.

### 3. Spotify-Playlist
In der HTML im Bereich `<iframe src="https://open.spotify.com/embed/playlist/...">` die Platzhalter-ID gegen eure echte Playlist-ID austauschen. Die findest du in der Spotify-Web-App → Playlist öffnen → Rechtsklick → "Teilen" → "Embed-Playlist".

### 4. Open Graph Image
Ich hab im HTML auf `https://lecirqle.de/og-image.jpg` referenziert. Brauchst du noch:
- 1200×630px JPG/PNG
- Sollte das cirqle-Logo + "run. meet. connect." + irgendein Stimmungsbild enthalten
- Wenn ihr eine Domain habt, die URL anpassen

Quick & dirty: Screenshot der Hero-Section (mit der Sun aufgestellt) → 1200×630 zuschneiden → als `og-image.jpg` ins Hauptverzeichnis legen.

## Custom Domain anhängen (später)

### Domain registrieren (~10€/Jahr)
Empfohlen:
- **lecirqle.de** (passt zum Insta-Handle)
- **cirqle.run** (.run TLD, sehr coole Domain für einen Run Club)
- **cirqle.de**
- **runcirqle.de**

Registrieren bei: [INWX](https://www.inwx.de), [Hetzner](https://www.hetzner.com), [Cloudflare](https://www.cloudflare.com/products/registrar/) (zum Selbstkostenpreis).

### Mit Vercel verbinden (2 Klicks)
1. Vercel-Dashboard → dein Projekt → "Settings" → "Domains"
2. Domain eintippen → "Add"
3. Vercel zeigt dir 2 DNS-Records die du beim Domain-Registrar eintragen musst (CNAME + A-Record)
4. ~5 Minuten warten, fertig. SSL kommt automatisch.

## Performance-Check nach Deploy

Nach dem Deploy mal durch [PageSpeed Insights](https://pagespeed.web.dev/) jagen. Deine Site sollte erreichen:
- **Performance: 85–95** (3D-Szenen kosten was, aber durch Lazy-Render gut)
- **Accessibility: 95+**
- **Best Practices: 95+**
- **SEO: 95+** (mit den Meta-Tags die ich hinzugefügt habe)

## Updates später machen

**Vercel mit Drag&Drop (einfachste Variante):**
- Änderungen in der HTML → wieder auf vercel.com → Projekt → "Deployments" → "Create Deployment" → neue Datei reinziehen

**Vercel mit Git (für regelmäßige Updates):**
- Push zu deinem GitHub-Repo → Vercel deployed automatisch
- Setup: GitHub-Account → neues Repo → HTML-Datei pushen → in Vercel-Dashboard mit Repo verknüpfen

## Hosting bei deutschem Webhoster (All-Inkl, IONOS, Strato)

Falls du lieber bei deutschem Hoster bleibst:
1. Beim Hoster ein Webhosting-Paket buchen (~3€/Monat reicht)
2. Per FTP (Filezilla) den `outputs/` Ordner ins `httpdocs/` oder `htdocs/` hochladen
3. `lecirqle.html` zu `index.html` umbenennen
4. Domain im Hoster-Panel auf den Ordner pointen

Nachteil: Langsamer als CDN-Hosting, kein automatischer Cache, kein Edge. Aber funktioniert gut für statische Seiten.
