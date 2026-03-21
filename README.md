**English** | [中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md)

# Stay Focus

A lightweight tool that adds a focus spotlight to any webpage or your entire screen (Desktop version) — helping you concentrate on what you're reading.

## Features

- 🎯 **Spotlight Mode** — dims the background; the area around your cursor stays bright
- 🖍️ **Highlight Mode** — background stays normal; your focus area gets a custom color
- 📄 **Full Row Mode** — highlight spans the entire screen width, like a reading ruler
- ⬛ 🔲 ⏺ **Shape Presets** — one-click switch between Square, Rounded Box, and Circle
- 🔗 **Link Dimensions (1:1)** — lock width and height together for perfect circles/squares
- 🌙 **Night Mode** — toggle between light and dark UI themes (☀️/🌙)
- ⌨️ **Keyboard Control** — move or resize the focus area using shortcuts (`Shift+Alt+Arrow`)
- 👻 **Only Enable for Specified Programs** — automatically hide the focus area when the mouse leaves the window (Desktop version supports specific process filtering)
- ↕️ **Adjustable size, opacity, color, and corner radius**
- 💾 **Settings are remembered** across sessions
- ⚡ **Hot updates** — changes apply instantly without reloading pages
- 🖱️ **Premium UI** — improved hover effects and full-row click support for a better experience

## Desktop Version (Windows)

The desktop application (built with Electron) brings Stay Focus to your entire system, not just the browser!

### Additional Desktop Features:
- **Global Overlay** — works on any application, desktop, or window
- **Process Target List** — automatically hide/show when specific applications are in focus
- **System Tray** — quick access and control from the tray

## Usage

### Browser Extension
1. Install the extension in Chrome (`chrome://extensions/` → Load unpacked)
2. Click the extension icon to open the control panel
3. Toggle the main switch to enable the spotlight

### Desktop Application
1. Download the [latest installer](https://github.com/EarthPlayer1935/Stay_focus/releases)
2. Run `Stay Focus Setup x.x.x.exe`
3. Launch from the desktop or system tray

## Development & Build

This project uses Node.js to automate the build and release process.

### Extension
1. `npm install`
2. `npm run build` (Packaged `.zip` in `release/`)

### Desktop (Electron)
1. `cd stay_focus_desktop`
2. `npm install`
3. `npm run dist` (Installer in `dist/`)

## FAQ

### ❓ Why does the spotlight freeze over Windows Task Manager (or other high-privilege windows)?

This is due to the Windows **User Interface Privilege Isolation (UIPI)** security mechanism.
- **Why**: Task Manager (especially with "Always on Top" enabled) runs at a High Integrity Level (Administrator privileges). For security, Windows prevents standard-privilege programs (like Stay Focus) from receiving mouse events occurring over high-privilege windows.
- **Solution**: Try **running Stay Focus as Administrator**. This will give it sufficient privileges to function correctly over those windows.

## Support

[![ko-fi](https://img.shields.io/badge/Support%20me%20on%20Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/earthplayer)

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** license.

- ✅ Free to use, share, and modify for **non-commercial** purposes
- ✅ Derivative works must use the **same license**
- ❌ **Commercial use is not permitted**

See the [LICENSE](./LICENSE) file for details.
