# Push to apexwebworxusa-svg GitHub

**Account:** https://github.com/apexwebworxusa-svg

## Step 1 — Create repository (on apexwebworxusa-svg account)

Log into **apexwebworxusa-svg** on GitHub, then:

1. Go to **https://github.com/new**
2. Owner: **apexwebworxusa-svg**
3. Repository name: **`apex-webworx`** (or `brand-assets`)
4. Public
5. **Empty repo** — no README, no .gitignore
6. Create repository

## Step 2 — Upload assets

### Option A — From your computer (easiest)

```bash
git clone -b cursor/apexwebworx-logos-5bb4 https://github.com/jozue06/00-lab.git
cd 00-lab/Apexwebworx
git init
git add .
git commit -m "Add Apex Detailing logo kit"
git branch -M main
git remote add origin https://github.com/apexwebworxusa-svg/apex-webworx.git
git push -u origin main
```

### Option B — GitHub web import

1. Create empty repo on apexwebworxusa-svg
2. Upload files from `Apexwebworx/` folder via GitHub web UI (drag & drop)

### Option C — Agent push (after repo exists)

Reply with the exact repo name (e.g. `apex-webworx`) after creating it.  
Add **jozue06** as a collaborator with **Write** access so the cloud agent can push.

---

## What's in this folder

| Path | Description |
|------|-------------|
| `assets/logo-pack/` | All logo types + favicons |
| `assets/apex-logo-primary.png` | Main logo |
| `docs/APEX-DETAILING-BRAND-GUIDE.md` | Brand guide |
