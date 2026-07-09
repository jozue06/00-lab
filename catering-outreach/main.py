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
from pathlib import Path

from config import Settings
from database import Lead, LeadDatabase
from email_finder import EmailFinder
from email_sender import EmailSender
from scanner import BusinessScanner

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("catering-outreach")


def cmd_scan(settings: Settings, db: LeadDatabase) -> None:
    scanner = BusinessScanner(settings)
    businesses = scanner.scan()

    added = 0
    for business in businesses:
        lead = Lead(
            place_id=business.place_id,
            name=business.name,
            address=business.address,
            phone=business.phone,
            website=business.website,
            email=None,
            status="discovered",
        )
        db.upsert_lead(lead)
        added += 1

    logger.info("Saved %d businesses to database", added)


def cmd_find_emails(db: LeadDatabase) -> None:
    finder = EmailFinder()
    leads = db.get_leads_by_status("discovered")
    if not leads:
        leads = [lead for lead in db.get_all_leads() if not lead.email]

    found = 0
    for lead in leads:
        if not lead.website:
            if lead.id is not None:
                db.mark_no_email(lead.id, "No website listed")
            logger.info("No website for %s — skipped", lead.name)
            continue

        email = finder.find_email(lead.website)
        if email and lead.id is not None:
            db.update_email(lead.id, email)
            found += 1
            logger.info("Found email for %s: %s", lead.name, email)
        elif lead.id is not None:
            db.mark_no_email(lead.id, "No email found on website")
            logger.info("No email found for %s (%s)", lead.name, lead.website)

    logger.info("Email lookup complete: %d emails found", found)


def cmd_preview(settings: Settings, db: LeadDatabase) -> None:
    leads = db.get_leads_by_status("ready")
    if not leads:
        logger.info("No leads ready to email. Run scan + find-emails first.")
        return

    sender = EmailSender(settings)
    for lead in leads[: settings.max_emails_per_run]:
        subject, body = sender._render_email(lead)
        print("=" * 60)
        print(f"To: {lead.name} <{lead.email}>")
        print(f"Subject: {subject}")
        print("-" * 60)
        print(body)
        print()


def cmd_send(settings: Settings, db: LeadDatabase) -> None:
    leads = db.get_leads_by_status("ready")
    if not leads:
        logger.info("No leads ready to email.")
        return

    if settings.dry_run:
        logger.warning("DRY_RUN=true — emails will be logged but NOT sent")

    sender = EmailSender(settings)
    sent = 0
    for lead in leads:
        if sent >= settings.max_emails_per_run:
            break
        count = sender.send_batch([lead])
        if count and not settings.dry_run and lead.id is not None:
            db.mark_emailed(lead.id)
        sent += count

    mode = "simulated" if settings.dry_run else "sent"
    logger.info("Outreach complete: %d emails %s", sent, mode)


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
    """Full pipeline: scan → find emails → send (respects dry_run)."""
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

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

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
