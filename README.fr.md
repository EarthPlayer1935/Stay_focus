[English](./README.md) | **Français**

# Stay Focus

Un outil léger qui ajoute un projecteur de mise au point sur n'importe quelle page web ou sur tout votre écran (version Bureau) — vous aidant à vous concentrer sur votre lecture.

## Caractéristiques

- 🎯 **Mode Projecteur** — assombrit l'arrière-plan ; la zone autour de votre curseur reste lumineuse
- 🖍️ **Mode Surbrillance** — l'arrière-plan reste normal ; votre zone de mise au point prend une couleur personnalisée
- 📄 **Mode Ligne Entière** — la surbrillance s'étend sur toute la largeur de l'écran, comme une règle de lecture
- ⬛ 🔲 ⏺ **Préréglages de Forme** — basculement en un clic entre Carré, Rectangle Arrondi et Cercle
- 🔗 **Lier les Dimensions (1:1)** — verrouille la largeur et la hauteur pour des cercles/carrés parfaits
- 🌙 **Mode Nuit** — basculez entre les thèmes d'interface clair et sombre (☀️/🌙)
- ⌨️ **Contrôle Clavier** — déplacez ou redimensionnez la zone de mise au point via des raccourcis (`Shift+Alt+Flèches`)
- 👻 **Masquage Auto** — masque automatiquement la zone de mise au point lorsque la souris quitte la fenêtre (La version Bureau supporte le filtrage par processus spécifiques)
- ↕️ **Taille, opacité, couleur et rayon de bordure réglables**
- 💾 **Paramètres mémorisés** — vos préférences sont conservées d'une session à l'autre
- ⚡ **Mises à jour Instantanées** — les modifications s'appliquent immédiatement sans recharger les pages
- 🖱️ **Interface Premium** — effets de survol améliorés et support du clic sur toute la ligne pour une meilleure expérience

## Version Bureau (Windows)

L'application de bureau (construite avec Electron) apporte Stay Focus à tout votre système, pas seulement au navigateur !

### Fonctions Bureau supplémentaires:
- **Superposition Globale** — fonctionne sur n'importe quelle application, bureau ou fenêtre
- **Liste de Processus Cibles** — masquage/affichage automatique lorsque des applications spécifiques sont actives
- **Barre d'état système** — accès rapide et contrôle depuis la zone de notification

## Utilisation

### Extension de navigateur
1. Installez l'extension dans Chrome (`chrome://extensions/` → Charger l'extension non empaquetée)
2. Cliquez sur l'icône de l'extension pour ouvrir le panneau de contrôle
3. Activez l'interrupteur principal pour lancer le projecteur

### Application de Bureau
1. Téléchargez le [dernier programme d'installation](https://github.com/EarthPlayer1935/Stay_focus/releases)
2. Exécutez `Stay Focus Setup x.x.x.exe`
3. Lancez depuis le bureau ou la barre d'état système

## Développement et Construction

Ce projet utilise Node.js pour automatiser le processus de construction et de publication.

### Extension
1. `npm install`
2. `npm run build` (Archive `.zip` générée dans `release/`)

### Bureau (Electron)
1. `cd stay_focus_desktop`
2. `npm install`
3. `npm run dist` (Programme d'installation dans `dist/`)

## Soutien

[![ko-fi](https://img.shields.io/badge/Soutenir%20sur%20Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/playerearth)

## Licence

Ce projet est sous licence **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**.

- ✅ Libre d'utiliser, de partager et de modifier à des fins **non commerciales**
- ✅ Les œuvres dérivées doivent utiliser la **même licence**
- ❌ **L'utilisation commerciale n'est pas autorisée**

Consultez le fichier [LICENSE](./LICENSE) pour plus de détails.
