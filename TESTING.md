# Silai Seekho — Testing Instructions

Serve locally first (no `file://` — JSON fetch requires a server):
```bash
npx serve .
# open http://localhost:3000
```

---

## 1. CSS / Styles load correctly

| Check | Expected |
|-------|----------|
| Nav bar visible on load | Frosted glass background, not transparent |
| Background wallpaper | Gold pattern visible beneath tinted overlay |
| Dark mode (🌙) | Nav darkens, all text remains readable |
| `color-mix()` fallback | Styles load in older Chrome/WebView (pre-111) |

---

## 2. localStorage persistence

1. Answer Chapter 1, Q1 correctly.
2. Hard-refresh (`Ctrl+Shift+R`).
3. **Expected:** Progress bar shows "1/6", Q1 answer highlighted green, Q2 unlocked, chapter pill shows ✓.

Verify saved keys via DevTools → Application → Local Storage → `silaiSeekho_v1`:
```json
{ "answers": {"0-0":"correct"}, "score":1, "chapDone":[true,...], "chapter":0, "lang":"hi" }
```

---

## 3. Learner Dashboard

1. Click **📊 Dashboard** tab.
2. **Expected:** Stat cards (chapters done, correct answers, streak, time), 6 chapter rows with progress bars, 4 skill level bars, suggestions section.

**With zero data (fresh user):**
- All chapter rows show "Not Started"
- Correct answers = 0
- Streak = 0
- Tip: "Start with Chapter 1"

**After completing a chapter:**
- Chapter row turns green with "Done ✓" badge
- Chapters done counter increments
- Skill bars update proportionally

**Streak logic:**
- Visit on consecutive days → streak increments
- Miss a day → streak resets to 0 on next visit

**Reset All:**
- Click "Reset All" → confirm dialog → all data cleared → returns to lesson view

---

## 4. Session time tracking

1. Stay on the app for ~1 minute.
2. Switch to another tab and back (triggers `visibilitychange` flush).
3. Check localStorage `totalTimeMs` — should be ~60000.
4. Dashboard "Total Time" stat should show "1 min".

---

## 5. Quiz interaction (per chapter)

### MCQ questions (all chapters)
- Answer wrong → red highlight, feedback visible, question stays unlocked
- Answer correct → green highlight, feedback visible, next question unlocks with scroll

### Fill-in-blank (Chapter 2, Q0)
- Type "warp" (or Hindi equivalent) → submit → green
- Wrong answer → red, retry allowed

### Drag-and-drop match (Chapter 5)
- Drag all 4 terms to correct definitions → score increments when last match correct
- Completed state persists on reload

### Chapter completion
- All questions answered correctly → confetti fires, chapter pill gets ✓
- `chapDone[i]` = true in localStorage

---

## 6. Knowledge Base

1. Click **Knowledge Base** tab.
2. Search "silk" → cards filtered live.
3. Filter by level "Beginner" → only beginner cards shown.
4. Click any card → lesson detail page opens with objectives, YouTube embed, links.
5. Back button → returns to KB list.

---

## 7. Design Studio

1. Click **Design Studio** tab.
2. Change palette → pattern updates live.
3. Change motif → pattern updates.
4. Click "3D Drape" → Three.js garment renders (may take 1–2s on first open).
5. Download PNG → file saves.

---

## 8. Bilingual toggle

| Toggle | Expected |
|--------|----------|
| हिं (Hindi only) | All `.en-only` content hidden |
| Hi·En (both) | Both scripts visible |
| EN (English only) | All `.hi-only` content hidden |

Language preference persists on reload.

---

## 9. Mobile responsiveness

Test at these breakpoints:
- **860px** — nav collapses to 2 rows (logo + controls top, tabs bottom)
- **600px** — reduced padding, compact quiz images
- **360px** — tab buttons show emoji only; match-game columns stack

---

## 10. PWA / offline

1. Load once (online) → service worker installs.
2. Toggle network offline in DevTools.
3. Reload → app still loads (cached assets).

---

## Backlog (not yet built)

- [ ] Completion Certificate (downloadable PNG/PDF when all 6 chapters done)
- [ ] Design Studio Gallery (save/load designs, URL-encoded sharing)
- [ ] Hindi Audio Pronunciation (Web Speech API TTS)
- [ ] Pattern Maker (measurements input → SVG pattern)
- [ ] AI Tailor Assistant (Claude API chat widget)
- [ ] Knowledge Base: replace placeholder lessons with verified images/video
