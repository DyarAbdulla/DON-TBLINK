# Deploy DON'T BLINK to Cloudflare Pages

Your GitHub repo: [https://github.com/DyarAbdulla/DON-TBLINK](https://github.com/DyarAbdulla/DON-TBLINK)

> **Important:** The camera only works on **HTTPS** (Cloudflare gives this automatically). Opening `index.html` as a local file will **not** work on mobile.

---

## Step 1 — Push code to GitHub

Open PowerShell in the project folder:

```powershell
cd c:\blinkeyes
git init
git add .
git commit -m "DON'T BLINK game - ready for Cloudflare Pages"
git branch -M main
git remote add origin https://github.com/DyarAbdulla/DON-TBLINK.git
git push -u origin main
```

If GitHub asks you to log in, use a **Personal Access Token** (not your password):
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate token with `repo` permission
3. Use the token as the password when pushing

---

## Step 2 — Connect Cloudflare Pages

1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com) and sign up / log in (free plan is fine).
2. Click **Workers & Pages** in the left menu.
3. Click **Create** → **Pages** → **Connect to Git**.
4. Authorize GitHub and select repository **`DyarAbdulla/DON-TBLINK`**.
5. Build settings:

| Setting | Value |
|---------|--------|
| **Production branch** | `main` |
| **Framework preset** | None |
| **Build command** | *(leave empty)* |
| **Build output directory** | `/` *(root — where index.html is)* |

6. Click **Save and Deploy**.

Wait 1–2 minutes. You will get a URL like:

`https://don-tblink.pages.dev`

---

## Step 3 — Test on phone & computer

1. Open your Cloudflare URL in **Chrome** (Android) or **Safari** (iPhone).
2. Allow **camera** when prompted.
3. Tap **Start Challenge**.
4. During countdown you should see **cyan/pink eye outlines** and a **green ring** when your face is detected.
5. After **GO!**, blink once to test fail screen.

---

## Custom domain (optional)

1. Cloudflare Pages → your project → **Custom domains**.
2. Add your domain (e.g. `dontblink.yourdomain.com`).
3. Follow DNS instructions Cloudflare shows.

---

## Updating the site later

After you change code locally:

```powershell
cd c:\blinkeyes
git add .
git commit -m "Describe your change"
git push
```

Cloudflare redeploys automatically on every push to `main`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Camera not working | Use the **https://** Cloudflare URL, not `file://` |
| Face not detected | Good lighting, face centered in circle |
| iPhone Safari | Must use published HTTPS link; allow camera in Settings → Safari |
| Blank page | Check Cloudflare build log; output directory must be `/` |
| MediaPipe slow | Normal on older phones; wait for green ring before GO |

---

## Project structure (static — no build needed)

```
DON-TBLINK/
├── index.html      ← entry point
├── css/styles.css
├── js/
│   ├── main.js
│   ├── blink-detector.js
│   ├── i18n.js
│   ├── particles.js
│   └── sounds.js
├── README.md
└── DEPLOY.md
```
