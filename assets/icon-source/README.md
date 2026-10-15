# App icon sources

Editable SVG originals for the BabyReady Virtual Educator icon (sleeping baby, app teal `#01696F`).
The PNGs in `assets/` are rendered from these files; to change the icon, edit the SVG and re-render.

| Source SVG | Rendered PNG | Notes |
| --- | --- | --- |
| `icon.svg` | `assets/icon.png` (1024×1024) | iOS/main icon — must have no transparency |
| `icon.svg` | `assets/favicon.png` (48×48) | Web browser tab |
| `android-foreground.svg` | `assets/android-icon-foreground.png` (1024×1024) | Transparent; artwork kept inside the adaptive-icon safe zone |
| `android-background.svg` | `assets/android-icon-background.png` (1024×1024) | Solid teal |
| `android-monochrome.svg` | `assets/android-icon-monochrome.png` (1024×1024) | White shape for Android themed icons |

Any SVG-to-PNG tool works (for example `sharp`, Inkscape or rsvg-convert).
