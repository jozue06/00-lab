# Catering Outreach System

A Python tool to find catering businesses in your area, discover their contact emails, and send personalized website outreach messages.

## What it does

1. **Scan** — Uses the Google Places API to find catering businesses near your location
2. **Find emails** — Visits each business website and looks for contact addresses
3. **Send** — Sends a polite, personalized outreach email (with dry-run mode enabled by default)

## Quick start

```bash
cd catering-outreach
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys, location, and email settings
```

### 1. Configure your environment

Copy `.env.example` to `.env` and set:

| Variable | Description |
|----------|-------------|
| `SEARCH_LOCATIONS` | Comma-separated cities, e.g. `Springfield, MO,Nixa, MO,Ozark, MO` |
| `SEARCH_RADIUS_METERS` | Radius around each city center (20000 ≈ 12 miles) |
| `GOOGLE_PLACES_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) — enable Places API |
| `SMTP_*` | Your email provider (Gmail app password, SendGrid, etc.) |
| `FROM_NAME` / `FROM_EMAIL` | Who the email appears to come from |
| `BUSINESS_ADDRESS` | Your physical address (CAN-SPAM requirement) |
| `DRY_RUN` | Keep `true` until you've reviewed previews |

### 2. Run the pipeline

```bash
# Step by step (recommended first time)
python main.py scan          # Find businesses
python main.py find-emails   # Look up contact emails
python main.py list          # Review what was found
python main.py preview       # Preview emails before sending

# When ready to send (set DRY_RUN=false in .env first)
python main.py send

# Or run everything at once
python main.py run-all
```

### 3. Export for manual review

```bash
python main.py export   # Creates exports/leads.csv
```

## Commands

| Command | Description |
|---------|-------------|
| `scan` | Search Google Places for catering businesses |
| `find-emails` | Scrape business websites for contact emails |
| `preview` | Print sample emails to the terminal |
| `send` | Send emails to leads with status `ready` |
| `list` | Show all leads and their status |
| `export` | Export leads to CSV |
| `run-all` | Run scan → find-emails → send |

## Lead statuses

| Status | Meaning |
|--------|---------|
| `discovered` | Business found, email not yet looked up |
| `ready` | Email found, ready to contact |
| `emailed` | Outreach email sent |
| `no_email` | No website or no email found |

## Safety and compliance

- **Dry run by default** — No emails are sent until you set `DRY_RUN=false`
- **Rate limiting** — `DELAY_BETWEEN_EMAILS_SECONDS` spaces out sends (default 30s)
- **Daily cap** — `MAX_EMAILS_PER_RUN` limits batch size (default 10)
- **Unsubscribe** — Every email includes an opt-out instruction
- **Physical address** — Required in the footer for US CAN-SPAM compliance

### Legal notes

Cold email is regulated in many jurisdictions (CAN-SPAM in the US, GDPR in the EU). You are responsible for:

- Only contacting businesses where outreach is lawful
- Honoring unsubscribe requests promptly
- Not misrepresenting who you are or what you offer
- Complying with your email provider's terms of service

This tool is intended for legitimate B2B outreach to local businesses, not bulk spam.

## Customizing the email

Edit `templates/outreach_email.txt`. Placeholders:

- `{business_name}` — The catering company's name
- `{sender_name}` — Your name from `.env`
- `{reply_to}` — Your reply-to address
- `{business_address}` — Your physical address

## Google Places API setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable **Places API**
3. Create an API key under Credentials
4. (Recommended) Restrict the key to Places API only

Free tier includes ~$200/month credit, which covers thousands of lookups.

## Gmail SMTP setup

For Gmail, use an [App Password](https://myaccount.google.com/apppasswords) (requires 2FA):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASSWORD=your_16_char_app_password
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Missing required environment variable` | Copy `.env.example` → `.env` and fill in values |
| `Places search failed: REQUEST_DENIED` | Check API key and enable Places API |
| No emails found | Many small businesses don't list emails publicly — try calling instead |
| Gmail blocks login | Use an App Password, not your regular password |

## Project structure

```
catering-outreach/
├── main.py              # CLI entry point
├── config.py            # Settings from .env
├── scanner.py           # Google Places business search
├── email_finder.py      # Website email extraction
├── email_sender.py      # SMTP email delivery
├── database.py          # SQLite lead tracking
├── templates/
│   └── outreach_email.txt
├── .env.example
└── requirements.txt
```
