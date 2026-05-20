# AI Challenge Hub 👁️😐

Viral webcam games powered by MediaPipe Face Mesh.

## Modes

| Mode | Description |
|------|-------------|
| **DON'T BLINK** | Survive without blinking (EAR eye tracking) |
| **DON'T LAUGH** | Keep a straight face (mouth smile detection) |

## Play locally

```powershell
cd c:\blinkeyes
python -m http.server 8080
```

Open `http://localhost:8080` — camera works on localhost.

## Deploy

See [DEPLOY.md](DEPLOY.md) — push to [GitHub](https://github.com/DyarAbdulla/DON-TBLINK) + Cloudflare Pages.

## Stack

- HTML / CSS (Deep Black Stealth HUD + `backgroundimage.webp`)
- Vanilla JS modules
- MediaPipe Face Mesh CDN
- English + Kurdish Sorani

## Files

```
index.html
backgroundimage.webp
css/styles.css
js/
  face-engine.js    — Shared AI loop (decoupled from UI)
  blink-detector.js — Blink / EAR
  laugh-detector.js — Smile / MAR
  game-hub.js       — Hub routing & UI
  main.js
  i18n.js
  particles.js
  sounds.js
```

MIT
