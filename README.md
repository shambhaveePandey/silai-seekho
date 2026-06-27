# 🪡 Silai Seekho — सिलाई सीखो

> An interactive bilingual (Hindi/English) web application teaching tailoring, fabric design, and sewing machine operation — designed for learners in India using both traditional leg-operated treadle machines and modern mini sewing devices.

[![Deploy Status](https://img.shields.io/badge/deploy-GitHub%20Pages-brightgreen)](https://shambhaveepandey.github.io/silai-seekho/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-blue)](manifest.webmanifest)

---

## 🌐 Live Demo

👉 **[shambhaveepandey.github.io/silai-seekho](https://shambhaveepandey.github.io/silai-seekho/)**

## 📔 Documentation

- 📖 **[User Manual (Notion)](https://www.notion.so/38cff97a75418185bdc3e5d5722402c3)** — how to use every feature, step by step.
- ⚙️ **[Developer & API Documentation (Notion)](https://www.notion.so/38cff97a75418120a0fad7cd48a58c00)** — architecture, data schema, the JS function API, theming and deployment.

---

## 📚 What is Silai Seekho?

Silai Seekho ("Learn Stitching") is a **free, offline-capable, mobile-first educational app** for learning tailoring fundamentals. It is designed for:

- 🧵 **Beginner tailors** in Indian households
- 👩‍🏫 **Tailoring school instructors** looking for digital supplements
- 📱 **Mobile-first learners** with limited internet access

The app teaches through **interactive SVG visualisations**, **animated diagrams**, **drag-and-drop exercises**, **bilingual quizzes**, and a **searchable Knowledge Base** with structured lesson plans — all runnable as a static site with no server required.

---

## ✨ Features

### 🎮 Interactive Lesson
- Hands-on chapters covering tools, fabrics, weaves, sewing machines, seams, and measurements
- Clickable hotspots on the sewing-machine diagram (needle, bobbin, presser foot, etc.)
- Animated stitching demonstration (GIF)
- Drag-and-drop exercises, bilingual quizzes, progress tracking, and confetti rewards

### 📖 Knowledge Base (new)
- **15 structured lessons** organised across **9 core topics**: tools, fabrics, machines, stitches, measurements, patterns, garments, embroidery, and business
- **4 skill levels**: Beginner → Intermediate → Advanced → Expert (colour-coded chips)
- **Full-text search** plus **level** and **topic** filters
- Each lesson card opens a detail modal with:
  - Bilingual title, summary, and learning objectives
  - **Embedded video tutorials** (YouTube playable inline)
  - **Reference links** to external guides and resources
  - A matching illustration

### 🥻 Saree & Blouse Course (new)
- A dedicated topic in the Knowledge Base teaching **traditional and modern Indian saree blouse** design and draping.
- **6 lessons** spanning all four levels: saree anatomy → blouse measurements → traditional drafting → regional draping styles (Nivi/Bengali/Gujarati) → modern princess-cut & designer back designs → bridal blouse with padding, boning and zardozi.
- Each lesson includes its own video tutorials and reference links.

### 🎨 Fabric Design Studio (new)
- Create your **own fabric pattern** in a live **2D editor**: pick a traditional Indian palette (Haldi, Indigo, Rani Pink, Mehendi, Ivory & Gold, Midnight) or custom colours, choose a motif (Paisley, Floral Booti, Bandhani, Block Print, Stripes, Checks, Polka Dots, Chevron), and tune density, scale and rotation.
- Preview the pattern **draped in 3D** (Three.js) — drag to rotate, toggle auto-spin.
- A **replication insights** panel explains **how to make the design on real cloth** — estimated repeat size, colours/screens, and a motif-specific step-by-step method (block printing, bandhani tie-dye, aari/zari embroidery, screen printing, weaving) plus a practical tip.
- **Download** your design as a PNG.

### 🌏 Bilingual & PWA
- Hindi/English content displayed side by side
- Installable as a Progressive Web App (manifest + icons)

---

## 🗂️ Repository Structure

```
silai-seekho/
├── index.html                  # Main app (nav, hero, 3 view tabs, lesson + KB + studio views, modal)
├── manifest.webmanifest        # PWA manifest
├── .nojekyll                   # Prevents GitHub Pages/Jekyll from stripping files
├── 404.html
├── README.md
├── LICENSE
│
├── src/
│   ├── css/
│   │   └── base.css            # Design tokens + lesson, view-switcher, KB, modal & Design Studio styles
│   ├── js/
│   │   ├── app.js              # Lesson logic: quizzes, hotspots, drag-drop, confetti, view switcher
│   │   ├── knowledge-base.js   # KB controller: load JSON, filters, search, lesson modal, video embed
│   │   ├── design-studio.js    # Fabric Design Studio: 2D pattern engine, 3D drape, replication insights
│   │   └── media-loader.js     # Mounts external SVG/GIF illustrations with onerror fallbacks
│   └── data/
│       └── knowledge-base.json # 21 lessons × 10 topics × 4 levels (bilingual), incl. Saree & Blouse
│
├── assets/
│   ├── illustrations/          # Externalised, loadable media
│   │   ├── tools.svg
│   │   ├── fabrics.svg
│   │   ├── weave.svg
│   │   ├── machine.svg
│   │   ├── seams.svg
│   │   ├── measurements.svg
│   │   ├── saree-blouse.svg    # Saree & blouse course illustration
│   │   └── stitching.gif       # Animated stitching demo
│   └── icons/
│       ├── logo.svg
│       ├── icon-192.png
│       ├── icon-512.png
│       └── apple-touch-icon.png
│
└── .github/
    └── workflows/
        └── deploy.yml          # GitHub Actions → GitHub Pages deploy
```

---

## 🛠️ Why the restructure? (Media-loading fix)

The original app was a single HTML file with **all SVGs inlined** — no real `.svg`/`.gif` files existed on disk, so the documented `assets/` folder couldn't load and a few CSS tokens were undefined. This version fixes that:

1. **Externalised illustrations** as real `.svg`/`.gif` files, referenced via `<img>` with `onerror` fallbacks so a missing asset never breaks the layout.
2. **Added `.nojekyll`** so GitHub Pages serves every file as-is (Jekyll otherwise ignores some paths).
3. **Subpath-safe URLs** — assets are resolved relative to the deployed base path, so the app works correctly under `/silai-seekho/`.
4. **Fixed undefined CSS tokens** (`--radius-full`, `--color-text-inverse`).

---

## 🚀 Running Locally

No build step — it's a static site. Serve the folder with any static server:

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then open `http://localhost:8000/`.

> Tip: open via a server (not `file://`) so the Knowledge Base JSON can be fetched.

---

## 📦 Deployment

Deployment is automated via **GitHub Actions** (`.github/workflows/deploy.yml`). On every push to `main`, the whole repository root is published to GitHub Pages. No manual build is required.

To enable it on a fork:
1. Go to **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` — the site deploys automatically.

---

## 📝 License

Released under the [MIT License](LICENSE).
