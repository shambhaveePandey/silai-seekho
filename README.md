# Silai Seekho — सिलाई सीखो

> An interactive bilingual (Hindi/English) web application teaching tailoring, fabric design, and sewing machine operation — designed for learners in India using both traditional leg-operated treadle machines and modern mini sewing devices.

[![Deploy Status](https://img.shields.io/badge/deploy-GitHub%20Pages-brightgreen)](https://shambhaveepandey.github.io/silai-seekho/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-blue)](manifest.webmanifest)

---

## Live Demo

[shambhaveepandey.github.io/silai-seekho](https://shambhaveepandey.github.io/silai-seekho/)

## Documentation

- [User Manual (Notion)](https://www.notion.so/38cff97a75418185bdc3e5d5722402c3) — how to use every feature, step by step.
- [Developer & API Documentation (Notion)](https://www.notion.so/38cff97a75418120a0fad7cd48a58c00) — architecture, data schema, the JS function API, theming and deployment.

---

## What is Silai Seekho?

Silai Seekho ("Learn Stitching") is a **free, offline-capable, mobile-first educational app** for learning tailoring fundamentals. It is designed for:

- Beginner tailors in Indian households
- Tailoring school instructors looking for digital supplements
- Mobile-first learners with limited internet access

The app teaches through **interactive quizzes**, **drag-and-drop exercises**, **bilingual feedback**, and a **searchable Knowledge Base** with structured lesson plans — all runnable as a static site with no server required.

---

## Features

### Interactive Lessons (expanded)

Each of the 6 chapters now contains **10 sequentially unlocking questions**, for **60 quiz questions total** across the full lesson. Questions range from Beginner to Expert and cover:

| Chapter | Topic | Questions |
|---------|-------|-----------|
| 0 | Sewing Tools | chalk, pins, scissors, seam ripper, needles, iron, press cloth, L-scale, chalk removal, rotary cutter |
| 1 | Fabrics | cotton, silk burn test, georgette, khadi, polyester iron temp, French seam fabric, silk needle, poly-cotton, breathability, linen shrinkage |
| 2 | Weave & Grain | fill-in-blank (warp), weft, selvedge, bias cut, grain line, plain weave, twill/denim, bias drape, grain correction, satin weave |
| 3 | Sewing Machines | treadle, bobbin, presser foot, stitch length for fine fabric, thread tension, oiling schedule, overlocker, feed dog, backstitch, needle safety |
| 4 | Seams & Finishes | dart, seam allowance, hem, French seam, flat-felled seam, pressing, clipping curves, grading, topstitch, ease |
| 5 | Measurements | drag-drop match game, bust, waist, ease for blouse, tape technique, sleeve length, hip depth, back length, collar/neck, petite sizing |

**Question features:**
- Sequential unlocking: answering correctly unlocks the next question (smooth scroll + fade-in)
- Difficulty badges: Beginner / Intermediate / Advanced / Expert (colour-coded)
- Real photographs from Wikimedia Commons illustrating each question (no AI-generated images, no SVGs)
- Bilingual feedback in Hindi and English after every answer, explaining the concept
- Chapter 2 includes a fill-in-blank exercise; Chapter 5 begins with a drag-and-drop matching game

### Knowledge Base

- **21 structured lessons** organised across **10 core topics**: tools, fabrics, machines, stitches, measurements, patterns, garments, embroidery, saree & blouse, and business
- **4 skill levels**: Beginner → Intermediate → Advanced → Expert (colour-coded chips)
- **Full-text search** plus **level** and **topic** filters
- Each lesson card opens a detail modal with bilingual title, learning objectives, embedded YouTube tutorials, and reference links

### Saree & Blouse Course

- A dedicated topic in the Knowledge Base teaching **traditional and modern Indian saree blouse** design and draping
- 6 lessons spanning all four levels: saree anatomy → blouse measurements → traditional drafting → regional draping styles (Nivi/Bengali/Gujarati) → modern princess-cut and designer back designs → bridal blouse with padding, boning and zardozi
- Each lesson includes its own video tutorials and reference links

### Fabric Design Studio

- Create your own fabric pattern in a live **2D editor**: pick a traditional Indian palette (Haldi, Indigo, Rani Pink, Mehendi, Ivory & Gold, Midnight) or custom colours, choose a motif (Paisley, Floral Booti, Bandhani, Block Print, Stripes, Checks, Polka Dots, Chevron), and tune density, scale and rotation
- Preview the pattern **draped in 3D** (Three.js) — drag to rotate, toggle auto-spin
- A **replication insights** panel explains how to make the design on real cloth — estimated repeat size, colours/screens, and a motif-specific step-by-step method (block printing, bandhani tie-dye, aari/zari embroidery, screen printing, weaving)
- Download your design as a PNG

### Bilingual & PWA

- Hindi/English content displayed side by side with a 3-way language toggle (Hindi only / Hinglish / English only)
- Installable as a Progressive Web App (manifest + icons)
- Works offline after first load

### Mobile-responsive layout

- Responsive across desktop, tablet, and phone
- Nav collapses to a two-row layout on screens ≤ 860 px: logo + controls on row 1, view-tab buttons on row 2
- On phones ≤ 600 px: reduced padding throughout, smaller nav and button text, compact quiz images
- On screens ≤ 360 px: view-tab buttons show emoji only to fit three tabs in one row; drag-drop columns stack vertically
- Touch-friendly tap targets throughout (minimum 44 px)

---

## Repository Structure

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
│   │   └── base.css            # Design tokens + all component styles + mobile media queries
│   ├── js/
│   │   ├── app.js              # Lesson logic: multi-question quizzes, drag-drop, confetti, view switcher
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
│   │   ├── saree-blouse.svg
│   │   └── stitching.gif       # Animated stitching demo
│   ├── bg-gold.jpg             # Background wallpaper (default)
│   ├── bg-red.jpg              # Background wallpaper (alternate)
│   ├── bg-teal.jpg             # Background wallpaper (alternate)
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

## Running Locally

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

## Deployment

Deployment is automated via **GitHub Actions** (`.github/workflows/deploy.yml`). On every push to `main`, the whole repository root is published to GitHub Pages. No manual build is required.

To enable it on a fork:
1. Go to **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` — the site deploys automatically.

---

## License

Released under the [MIT License](LICENSE).
