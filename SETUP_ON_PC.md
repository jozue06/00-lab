# Run on your PC (Windows / Mac / Linux)

This project is meant to run **locally on your computer**, not on mobile. Follow these steps on a desktop or laptop.

## Step 1 — Save to your GitHub (`apexwebworxusa-svg`)

### Option A: Create a new repo and push (recommended)

On your PC, open **Terminal** (Mac/Linux) or **PowerShell** (Windows):

```bash
# 1. Clone the ready-to-use standalone branch
git clone -b catering-outreach-standalone https://github.com/jozue06/00-lab.git catering-outreach
cd catering-outreach

# 2. Create a new empty repo on GitHub:
#    Go to https://github.com/new
#    Owner: apexwebworxusa-svg
#    Name: catering-outreach
#    Leave it empty (no README)

# 3. Point git to YOUR repo and push
git remote rename origin old-origin
git remote add origin https://github.com/apexwebworxusa-svg/catering-outreach.git
git push -u origin catering-outreach-standalone:main
```

Your code will live at:
**https://github.com/apexwebworxusa-svg/catering-outreach**

### Option B: Download ZIP (no git)

1. Open: https://github.com/jozue06/00-lab/tree/catering-outreach-standalone
2. Click **Code → Download ZIP**
3. Unzip on your PC
4. (Optional) Upload folder to a new repo on https://github.com/apexwebworxusa-svg

---

## Step 2 — Install Python

- **Windows:** https://www.python.org/downloads/ — check **"Add Python to PATH"** during install
- **Mac:** `brew install python3` or use python.org installer

Verify:

```bash
python --version
# or
python3 --version
```

---

## Step 3 — Install and configure

```bash
cd catering-outreach

# Windows
python -m venv .venv
.venv\Scripts\activate

# Mac / Linux
python3 -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` with a text editor (Notepad, VS Code, etc.):

| Setting | What to add |
|---------|-------------|
| `GOOGLE_PLACES_API_KEY` | From [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `SMTP_USER` / `SMTP_PASSWORD` | Your email (Gmail app password works) |
| `FROM_NAME` / `FROM_EMAIL` | Your name and email |
| `BUSINESS_ADDRESS` | Your real address |

Cities are already set for Springfield, Nixa, and Ozark MO.

---

## Step 4 — Start the dashboard

```bash
python main.py web
```

Open in your **PC browser** (Chrome, Edge, Firefox):

**http://127.0.0.1:5000**

From the dashboard:

1. **Scan businesses**
2. **Find emails**
3. Write your email in the composer
4. **Preview**
5. When ready, set `DRY_RUN=false` in `.env` and click **Send to unsent**

---

## Troubleshooting on Windows

| Problem | Fix |
|---------|-----|
| `python` not found | Use `py` instead, or reinstall Python with PATH enabled |
| `pip` not found | Run `python -m pip install -r requirements.txt` |
| Gmail won't send | Use an [App Password](https://myaccount.google.com/apppasswords), not your normal password |
| Port 5000 in use | Change port in `main.py` / `app.py`: `app.run(port=5001)` |

---

## After first push to your GitHub

On any PC in the future, just:

```bash
git clone https://github.com/apexwebworxusa-svg/catering-outreach.git
cd catering-outreach
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
cp .env.example .env          # then edit .env
python main.py web
```
