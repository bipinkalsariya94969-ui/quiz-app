# ⚡ MathBattle — Live Quiz Competition

A mobile-friendly, real-time math quiz competition app for students (Class 1–8).

![MathBattle](https://img.shields.io/badge/MathBattle-Live%20Quiz-7c3aed?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Ready-10b981?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-22d3ee?style=for-the-badge)

## ✨ Features

- 📱 **Mobile-first** — Designed for phones, works everywhere
- 🎮 **Game-like experience** — Animations, sounds, confetti
- ⏱️ **Timed questions** — 15-30 seconds per question
- 🏆 **Live leaderboard** — See your rank in real-time
- 🔊 **Sound effects** — Toggle on/off for correct/wrong answers
- 🎯 **Auto scoring** — Ranked by accuracy + speed
- 📊 **Google Sheets** — All data tracked automatically
- 🎨 **Kid-friendly** — Vibrant colors, big buttons, simple UX

## 🚀 Quick Start

1. Open `index.html` in your browser
2. Login as Admin: **Mobile:** `0000000000` | **MPIN:** `9999`
3. Start a competition
4. Register a student account and play!

> The app works immediately in **Demo Mode** — no setup required!

## 🏗️ Architecture

```
Frontend (HTML/CSS/JS) ←→ Google Apps Script API ←→ Google Sheets
     ↕
  Demo Mode (localStorage)
```

## 📂 Files

| File | Purpose |
|------|---------|
| `index.html` | Main single-page app |
| `css/styles.css` | Complete design system |
| `js/config.js` | Configuration & settings |
| `js/api.js` | API layer + demo backend |
| `js/sounds.js` | Sound effects (Web Audio) |
| `js/effects.js` | Confetti & animations |
| `js/auth.js` | Login & session management |
| `js/quiz.js` | Quiz engine & timer |
| `js/leaderboard.js` | Rankings & podium |
| `js/app.js` | Main controller |
| `google-apps-script/Code.gs` | Backend API for Google Sheets |

## 📖 Full Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete setup instructions.

## 🎮 How It Works

1. **Admin** creates a competition (sets questions, time, difficulty)
2. **Students** join the competition
3. **Countdown** starts (10 seconds)
4. **Quiz begins** — answer math questions as fast as possible
5. **Results** — see your score, accuracy, and rank
6. **Leaderboard** — top 10 with podium for top 3

## 🔧 Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Google Apps Script
- **Database:** Google Sheets
- **Hosting:** GitHub Pages / Any static host
- **Audio:** Web Audio API (no external files)

## 📄 License

MIT License — use freely for education!
