# 汉字练习 — Pinyin Typing Trainer

A clean, minimal Chinese character typing practice app built with SvelteKit and TypeScript. Type the pinyin for each displayed Chinese character (no tone marks required) and track your speed and accuracy in real time.

![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=flat&logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)

---

## Features

- **Character-by-character pinyin input** — type the toneless pinyin for each character in a word one at a time
- **Mixed word lengths** — sessions draw from 2-, 3-, and 4-character word lists for varied practice
- **30 words per session** — enough to get a meaningful WPM and accuracy reading without fatigue
- **Live stats bar** — words completed, WPM, accuracy %, and elapsed time update as you type
- **Animated transitions** — completed words fly upward off-screen; the next word slides in smoothly
- **Results screen** — WPM, accuracy, time, correct/wrong counts, and a grade (完美 → 继续加油)
- **Light / Dark theme** — toggle in the header; preference applied via a `data-theme` attribute on `<html>`
- **No tone marks needed** — just type the base pinyin syllable (e.g. `ni` for 你, `hao` for 好)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | [SvelteKit](https://kit.svelte.dev/) with Svelte 5 runes |
| Language | TypeScript |
| Styling | Scoped component CSS + CSS custom properties (no external UI library) |
| Word data | Static TypeScript modules (`words-2.ts`, `words-3.ts`, `words-4.ts`) |
| Pinyin util | Custom `pinyin.ts` — strips tone diacritics for toneless comparison |

---

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── CharacterTile.svelte   # Single character + pinyin display tile
│   │   ├── HomeScreen.svelte      # Start screen with session info
│   │   ├── PracticeArea.svelte    # Core typing engine and word stage
│   │   ├── ResultsScreen.svelte   # End-of-session stats card
│   │   ├── StatsBar.svelte        # Live progress / WPM / accuracy bar
│   │   └── ThemeToggle.svelte     # Light / dark mode button
│   ├── pinyin.ts                  # Tone-stripping utility
│   ├── styles.css                 # Global CSS variables and base styles
│   ├── words.ts                   # Session builder (getSession)
│   ├── words-2.ts                 # 2-character word list
│   ├── words-3.ts                 # 3-character word list
│   └── words-4.ts                 # 4-character word list
└── routes/
    ├── +layout.svelte             # Global layout (imports styles.css)
    ├── +page.svelte               # App shell — screen routing (home → practice → results)
    └── +page.ts                   # Page load config
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm (comes with Node)

### Install & Run

```sh
# clone the repo
git clone https://github.com/5icheng7hang/TypingPractice.git
cd TypingPractice

# install dependencies
npm install

# start the dev server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```sh
npm run build
npm run preview   # preview the production build locally
```

### Native Desktop Build

This repo currently uses two working branches:

- `main` — web version, used for Vercel deployment
- `feat/tauri` — native desktop version, used for Tauri builds and GitHub Releases

If you are working on the desktop app, switch to `feat/tauri`.

To build the native app locally:

```sh
npm run tauri build
```

To build only specific bundles:

```sh
npm run tauri build -- --bundles dmg
npm run tauri build -- --bundles nsis,msi
```

### Native Release Reminders

The GitHub Actions native release workflow is intended to be used from `feat/tauri`.

Please follow these reminders:

1. Do native release work on `feat/tauri`
2. Only create release tags from `feat/tauri`
3. Keep using `main` for the web/Vercel deployment flow
4. If you develop a feature on one branch, port it to the other branch before releasing from that side

Native release flow:

```sh
git checkout feat/tauri
git pull
git tag v0.1.5
git push origin feat/tauri
git push origin v0.1.5
```

Pushing a new `v*` tag from `feat/tauri` will automatically build and publish:

- Windows installers
- macOS `.dmg`

GitHub Release assets are created by the native release workflow in this branch.

---

## How to Play

1. Click **开始练习** on the home screen.
2. A Chinese word appears in the centre of the screen. Each character shows its pinyin above it.
3. Type the toneless pinyin for the **current character** (highlighted). For example:
   - 你好 → type `ni`, press any key to move on, then type `hao`
4. After the last character of a word, press **Space** to advance to the next word.
5. Complete all 30 words to see your results.

> Tip: tones are never required — `zhongguo` works just as well as `zhōngguó`.

---

## Grading

| Accuracy | Grade |
|---|---|
| ≥ 98 % | 完美 |
| ≥ 90 % | 优秀 |
| ≥ 75 % | 良好 |
| ≥ 60 % | 及格 |
| < 60 % | 继续加油 |

---

## License

MIT