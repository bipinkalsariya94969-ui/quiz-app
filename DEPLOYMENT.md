# 📚 MathBattle — Deployment Guide

Complete step-by-step guide to deploy MathBattle live.

---

## 🎯 Quick Start (Demo Mode)

The app works **immediately out of the box** in Demo Mode!

1. Open `index.html` in your browser
2. Demo login: **Mobile:** `0000000000` | **MPIN:** `9999` (Admin)
3. Start a competition from the Admin Panel
4. Register a new student account to play

> **Demo Mode** stores everything in your browser's localStorage. No server needed!

---

## 🌐 Full Deployment (with Google Sheets Backend)

### Step 1: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it **"MathBattle Data"**
3. Create 3 sheets (tabs at the bottom):
   - `Users`
   - `Competitions`
   - `Results`
4. **Copy the Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
   ```

### Step 2: Set Up Google Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete any existing code in `Code.gs`
3. Paste the entire contents of `google-apps-script/Code.gs`
4. Update the `SPREADSHEET_ID` variable at the top:
   ```javascript
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
   ```
5. Click **Save** (💾)

### Step 3: Run Setup

1. In Apps Script, select `setup` from the function dropdown (top bar)
2. Click **Run** (▶️)
3. **Authorize** the script when prompted (click "Review Permissions" → "Allow")
4. Check your Google Sheet — you should see headers in all 3 sheets

### Step 4: Deploy as Web App

1. Click **Deploy → New Deployment**
2. Click the gear icon ⚙️ → Select **Web app**
3. Settings:
   - **Description:** MathBattle API
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**
5. **Copy the Web App URL** (looks like `https://script.google.com/macros/s/xxx/exec`)

### Step 5: Configure Frontend

1. Open `js/config.js`
2. Update the `API_URL`:
   ```javascript
   API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
   ```
3. Set `DEMO_MODE` to `false`:
   ```javascript
   DEMO_MODE: false,
   ```

### Step 6: Deploy Frontend

#### Option A: GitHub Pages (Recommended, Free)

1. Create a GitHub repository
2. Push all files (except `google-apps-script/` folder):
   ```bash
   git init
   git add .
   git commit -m "Initial: MathBattle quiz app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/mathbattle.git
   git push -u origin main
   ```
3. Go to **Settings → Pages**
4. Source: **Deploy from a branch** → **main** → **/ (root)**
5. Click **Save**
6. Your app will be live at: `https://YOUR_USERNAME.github.io/mathbattle/`

#### Option B: Netlify (Free)

1. Go to [Netlify](https://netlify.com)
2. Drag and drop your project folder
3. Done! You get a free .netlify.app URL

#### Option C: Any Static Hosting

Just upload the files to any web server. The app is pure HTML/CSS/JS — no build step needed.

---

## 📱 How to Use

### For Admin:
1. Login with Mobile: `0000000000`, MPIN: `9999`
2. Set competition parameters (questions, time, difficulty)
3. Click **"Start Competition"**
4. Share the app link with students

### For Students:
1. Open the app link on their phone
2. Click **"Create Account"**
3. Enter name, mobile, and create a 4-digit MPIN
4. When a competition is active, click **"Join Competition"**
5. Answer questions as fast as possible!
6. View results and leaderboard after finishing

---

## 🔧 Customization

### Change Admin MPIN
In both `js/config.js` and `google-apps-script/Code.gs`:
```javascript
ADMIN_MPIN: 'YOUR_NEW_MPIN',
```

### Change Default Settings
In `js/config.js`:
```javascript
QUESTIONS_PER_QUIZ: 20,      // Number of questions
TIME_PER_QUESTION: 15,       // Seconds per question
DEFAULT_DIFFICULTY: 'mixed', // easy, medium, hard, mixed
```

### Add Custom Questions
Modify the `generateQuestions()` function in `Code.gs` or `api.js` to include your own question templates.

---

## 📂 Project Structure

```
quiz-app/
├── index.html                    # Main app (all screens)
├── css/
│   └── styles.css                # Complete design system
├── js/
│   ├── config.js                 # App configuration
│   ├── sounds.js                 # Web Audio API sound effects
│   ├── effects.js                # Confetti & visual effects
│   ├── api.js                    # API layer + Demo backend
│   ├── auth.js                   # Authentication module
│   ├── quiz.js                   # Quiz engine & timer
│   ├── leaderboard.js            # Leaderboard rendering
│   └── app.js                    # Main app controller
├── google-apps-script/
│   └── Code.gs                   # Google Apps Script backend
├── README.md                     # Documentation
└── DEPLOYMENT.md                 # This file
```

---

## ⚠️ Troubleshooting

### "CORS Error" when calling API
- Make sure the Google Apps Script is deployed with **"Anyone"** access
- Use `text/plain` content type (not `application/json`)
- Redeploy after any code changes

### Google Sheet not updating
- Check Apps Script logs: **View → Execution log**
- Ensure SPREADSHEET_ID is correct
- Run the `setup()` function again

### Questions not loading
- Verify competition status is 'active' or 'waiting'
- Check browser console for errors
- Try refreshing the page

### Admin panel not showing
- Login with the admin credentials (MPIN: 9999)
- Check `config.js` ADMIN_MPIN matches your login MPIN
