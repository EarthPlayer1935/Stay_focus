[English](./README.md) | **Deutsch**

# Stay Focus

Ein leichtgewichtiges Tool, das ein Fokus-Spotlight auf jeder Webseite oder Ihrem gesamten Bildschirm (Desktop-Version) hinzufügt — damit du dich besser auf das Lesen konzentrieren kannst.

## Funktionen

- 🎯 **Spotlight-Modus** — dimmt den Hintergrund; der Bereich um den Cursor bleibt hell
- 🖍️ **Hervorhebungsmodus** — der Hintergrund bleibt normal; der Fokusbereich erhält eine benutzerdefinierte Farbe
- 📄 **Vollzeilenmodus** — die Hervorhebung erstreckt sich über die gesamte Bildschirmbreite, wie ein Leselineal
- ⬛ 🔲 ⏺ **Form-Voreinstellungen** — Wechsel zwischen Quadrat, abgerundetem Rechteck und Kreis mit einem Klick
- 🔗 **Maße koppeln (1:1)** — fixiert Breite und Höhe für perfekte Kreise/Quadrate
- 🌙 **Nachtmodus** — wechseln Sie zwischen hellem und dunklem Design (☀️/🌙)
- ⌨️ **Tastatursteuerung** — verschieben oder ändern Sie den Fokusbereich mit Kurzbefehlen (`Shift+Alt+Pfeiltasten`)
- 👻 **Automatisches Ausblenden** — blendet den Fokusbereich automatisch aus, wenn die Maus das Fenster verlässt (Desktop-Version unterstützt die Filterung nach spezifischen Prozessen)
- ↕️ **Einstellbare Parameter** — Größe, Deckkraft, Farbe und Eckenradius anpassbar
- 💾 **Gespeicherte Einstellungen** — bleibt über Sitzungen hinweg erhalten
- ⚡ **Live-Updates** — Änderungen werden sofort übernommen, ohne die Seite neu laden zu müssen
- 🖱️ **Premium UI** — verbesserte Hover-Effekte und Klick-Unterstützung für die gesamte Zeile für ein besseres Erlebnis

## Desktop-Version (Windows)

Die Desktop-Anwendung (mit Electron erstellt) bringt Stay Focus auf Ihr gesamtes System, nicht nur in den Browser!

### Zusätzliche Desktop-Funktionen:
- **Globales Overlay** — funktioniert über jeder Anwendung, dem Desktop oder Fenstern
- **Prozess-Zielliste** — automatisches Aus- und Einblenden, wenn bestimmte Anwendungen im Fokus sind
- **System-Tray** — schneller Zugriff und Steuerung über die Taskleiste

## Verwendung

### Browser-Erweiterung
1. Installieren Sie die Erweiterung in Chrome (`chrome://extensions/` → Entpackte Erweiterung laden)
2. Klicken Sie auf das Erweiterungssymbol, um das Bedienfeld zu öffnen
3. Lege den Hauptschalter um, um das Spotlight zu aktivieren

### Desktop-Anwendung
1. Laden Sie das [neueste Installationsprogramm](https://github.com/EarthPlayer1935/Stay_focus/releases) herunter
2. Führen Sie `Stay Focus Setup x.x.x.exe` aus
3. Starten Sie vom Desktop oder aus der System-Tray

## Entwicklung & Erstellung

Dieses Projekt verwendet Node.js, um den Erstellungs- und Veröffentlichungsprozess zu automatisieren.

### Erweiterung
1. `npm install`
2. `npm run build` (Gepackte `.zip` wird im Verzeichnis `release/` generiert)

### Desktop (Electron)
1. `cd stay_focus_desktop`
2. `npm install`
3. `npm run dist` (Installationsprogramm im Verzeichnis `dist/`)

## Unterstützung

[![ko-fi](https://img.shields.io/badge/Auf%20Ko--fi%20unterstützen-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/playerearth)

## Lizenz

Dieses Projekt ist unter der **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** Lizenz lizenziert.

- ✅ Frei zu verwenden, zu teilen und zu modifizieren für **nicht-kommerzielle** Zwecke
- ✅ Abgeleitete Werke müssen unter der **gleichen Lizenz** veröffentlicht werden
- ❌ **Kommerzielle Nutzung ist nicht gestattet**

Weitere Informationen findest du in der [LICENSE](./LICENSE)-Datei.
