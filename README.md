# DON'T BLINK 👁️

Viral AI webcam game — blink once and you lose.

**Live demo:** Deploy to [Cloudflare Pages](DEPLOY.md) (see deployment guide).

## Play locally

```powershell
cd c:\blinkeyes
python -m http.server 8080
```

Open `http://localhost:8080` (camera works on localhost).

## Features

- MediaPipe FaceMesh + Eye Aspect Ratio blink detection
- English + Kurdish Sorani (RTL)
- Mobile + desktop responsive UI
- localStorage leaderboard, share result
- Cyberpunk neon design

## Deploy

See **[DEPLOY.md](DEPLOY.md)** for GitHub + Cloudflare Pages instructions.

Repo: [github.com/DyarAbdulla/DON-TBLINK](https://github.com/DyarAbdulla/DON-TBLINK)

## Requirements

- Modern browser (Chrome, Edge, Safari, Firefox)
- Webcam + **HTTPS** (required on mobile; Cloudflare provides this)
- Internet (MediaPipe loads from CDN)

## License

MIT
