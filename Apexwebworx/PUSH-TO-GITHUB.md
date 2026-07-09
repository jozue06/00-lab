# Push to Apexwebworx GitHub

## Step 1 — Create the repo (one time)

1. Go to **https://github.com/new**
2. Repository name: **`Apexwebworx`**
3. Description: `Apex Detailing brand assets and web project`
4. Public
5. **Do not** add README, .gitignore, or license (keep empty)
6. Click **Create repository**

## Step 2 — Push assets

From your machine or this cloud agent, run:

```bash
cd /tmp/Apexwebworx   # or clone from branch below
git remote add origin https://github.com/jozue06/Apexwebworx.git
git push -u origin main
```

**Or** copy from the prepared branch:

```bash
git clone -b cursor/apexwebworx-logos-5bb4 https://github.com/jozue06/00-lab.git temp
cp -r temp/Apexwebworx/* .
# then init and push to Apexwebworx
```

## What's included

- `assets/logo-pack/` — all logo types (favicon, horizontal, icon, etc.)
- `assets/apex-logo-primary.png` — main logo
- `docs/APEX-DETAILING-BRAND-GUIDE.md` — brand reference
