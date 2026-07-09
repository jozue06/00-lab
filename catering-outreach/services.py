from __future__ import annotations

import logging
from pathlib import Path

from config import Settings
from database import Lead, LeadDatabase
from email_finder import EmailFinder
from email_sender import EmailSender
from scanner import BusinessScanner

logger = logging.getLogger(__name__)

TEMPLATE_PATH = Path(__file__).resolve().parent / "templates" / "outreach_email.txt"
DEFAULT_SUBJECT = "Quick question about {business_name}'s website"
EMAIL_SUBJECT_KEY = "email_subject"
EMAIL_BODY_KEY = "email_body"


def scan_businesses(settings: Settings, db: LeadDatabase) -> int:
    scanner = BusinessScanner(settings)
    businesses = scanner.scan()

    for business in businesses:
        db.upsert_lead(
            Lead(
                place_id=business.place_id,
                name=business.name,
                address=business.address,
                phone=business.phone,
                website=business.website,
                email=None,
                status="discovered",
            )
        )

    return len(businesses)


def find_emails(db: LeadDatabase) -> dict[str, int]:
    finder = EmailFinder()
    leads = db.get_leads_by_status("discovered")
    if not leads:
        leads = [lead for lead in db.get_all_leads() if not lead.email]

    found = 0
    skipped = 0
    for lead in leads:
        if not lead.website:
            if lead.id is not None:
                db.mark_no_email(lead.id, "No website listed")
            skipped += 1
            continue

        email = finder.find_email(lead.website)
        if email and lead.id is not None:
            db.update_email(lead.id, email)
            found += 1
        elif lead.id is not None:
            db.mark_no_email(lead.id, "No email found on website")
            skipped += 1

    return {"found": found, "skipped": skipped}


def get_email_templates(db: LeadDatabase) -> dict[str, str]:
    default_body = TEMPLATE_PATH.read_text(encoding="utf-8")
    return {
        "subject": db.get_setting(EMAIL_SUBJECT_KEY, DEFAULT_SUBJECT),
        "body": db.get_setting(EMAIL_BODY_KEY, default_body),
    }


def save_email_templates(db: LeadDatabase, subject: str, body: str) -> None:
    db.set_setting(EMAIL_SUBJECT_KEY, subject.strip())
    db.set_setting(EMAIL_BODY_KEY, body.strip())


def send_unsent_emails(settings: Settings, db: LeadDatabase) -> dict[str, int | bool]:
    templates = get_email_templates(db)
    leads = db.get_unsent_leads()
    if not leads:
        return {"sent": 0, "dry_run": settings.dry_run}

    sender = EmailSender(
        settings,
        subject_template=templates["subject"],
        body_template=templates["body"],
    )

    sent = 0
    for lead in leads:
        if sent >= settings.max_emails_per_run:
            break
        count = sender.send_batch([lead])
        if count:
            if not settings.dry_run and lead.id is not None:
                db.mark_emailed(lead.id)
            sent += count

    return {"sent": sent, "dry_run": settings.dry_run}


def preview_email(settings: Settings, db: LeadDatabase, lead_name: str | None = None) -> dict[str, str]:
    templates = get_email_templates(db)
    sender = EmailSender(
        settings,
        subject_template=templates["subject"],
        body_template=templates["body"],
    )

    sample_lead = Lead(
        place_id="preview",
        name=lead_name or "Sample Catering Co.",
        address="123 Main St, Springfield, MO",
        phone=None,
        website=None,
        email="contact@example.com",
        status="ready",
    )
    subject, body = sender.render_email(sample_lead)
    return {"subject": subject, "body": body, "to": sample_lead.email, "name": sample_lead.name}
