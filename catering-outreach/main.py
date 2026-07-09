#!/usr/bin/env python3
"""
Catering Outreach System

Scan local catering businesses, find contact emails, and send outreach messages.
"""

from __future__ import annotations

import argparse
import csv
import logging
import sys

from config import Settings
from database import LeadDatabase
from services import find_emails, preview_email, scan_businesses, send_unsent_emails

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("catering-outreach")


def cmd_scan(settings: Settings, db: LeadDatabase) -> None:
    count = scan_businesses(settings, db)
    logger.info("Saved %d businesses to database", count)


def cmd_find_emails(db: LeadDatabase) -> None:
    result = find_emails(db)
    logger.info(
        "Email lookup complete: %d found, %d skipped",
        result["found"],
        result["skipped"],
    )


def cmd_preview(settings: Settings, db: LeadDatabase) -> None:
    leads = db.get_leads_by_status("ready")
    if not leads:
        logger.info("No leads ready to email. Run scan + find-emails first.")
        return

    preview = preview_email(settings, db, lead_name=leads[0].name)
    print("=" * 60)
    print(f"To: {preview['name']} <{preview['to']}>")
    print(f"Subject: {preview['subject']}")
    print("-" * 60)
    print(preview["body"])
    print()


def cmd_send(settings: Settings, db: LeadDatabase) -> None:
    if settings.dry_run:
        logger.warning("DRY_RUN=true — emails will be logged but NOT sent")

    result = send_unsent_emails(settings, db)
    mode = "simulated" if result["dry_run"] else "sent"
    logger.info("Outreach complete: %d emails %s", result["sent"], mode)


def cmd_list(db: LeadDatabase) -> None:
    leads = db.get_all_leads()
    if not leads:
        print("No leads in database. Run: python main.py scan")
        return

    print(f"{'ID':<4} {'Status':<12} {'Name':<30} {'Email':<30}")
    print("-" * 80)
    for lead in leads:
        email = lead.email or "-"
        print(f"{lead.id:<4} {lead.status:<12} {lead.name[:28]:<30} {email[:28]:<30}")


def cmd_export(settings: Settings, db: LeadDatabase) -> None:
    settings.exports_dir.mkdir(parents=True, exist_ok=True)
    output = settings.exports_dir / "leads.csv"
    leads = db.get_all_leads()

    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["id", "name", "address", "phone", "website", "email", "status", "notes"])
        for lead in leads:
            writer.writerow(
                [
                    lead.id,
                    lead.name,
                    lead.address,
                    lead.phone or "",
                    lead.website or "",
                    lead.email or "",
                    lead.status,
                    lead.notes or "",
                ]
            )

    logger.info("Exported %d leads to %s", len(leads), output)


def cmd_run_all(settings: Settings, db: LeadDatabase) -> None:
    cmd_scan(settings, db)
    cmd_find_emails(db)
    cmd_send(settings, db)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Scan catering businesses and send website outreach emails.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("scan", help="Find catering businesses in your area")
    subparsers.add_parser("find-emails", help="Look up contact emails from business websites")
    subparsers.add_parser("preview", help="Preview emails before sending")
    subparsers.add_parser("send", help="Send outreach emails to ready leads")
    subparsers.add_parser("list", help="Show all leads in the database")
    subparsers.add_parser("export", help="Export leads to CSV")
    subparsers.add_parser("run-all", help="Run scan, find-emails, and send in one go")
    subparsers.add_parser("web", help="Start the local web dashboard")

    return parser


def cmd_web() -> None:
    from app import init_app

    init_app()
    logger.info("Open http://127.0.0.1:5000 in your browser")
    from app import app

    app.run(host="127.0.0.1", port=5000, debug=False)


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "web":
        try:
            cmd_web()
        except ValueError as exc:
            logger.error("%s", exc)
            logger.error("Copy .env.example to .env and fill in your values.")
            return 1
        return 0

    try:
        settings = Settings.load()
    except ValueError as exc:
        logger.error("%s", exc)
        logger.error("Copy .env.example to .env and fill in your values.")
        return 1

    db = LeadDatabase(settings.db_path)

    commands = {
        "scan": lambda: cmd_scan(settings, db),
        "find-emails": lambda: cmd_find_emails(db),
        "preview": lambda: cmd_preview(settings, db),
        "send": lambda: cmd_send(settings, db),
        "list": lambda: cmd_list(db),
        "export": lambda: cmd_export(settings, db),
        "run-all": lambda: cmd_run_all(settings, db),
    }

    commands[args.command]()
    return 0


if __name__ == "__main__":
    sys.exit(main())
