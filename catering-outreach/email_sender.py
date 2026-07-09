import logging
import smtplib
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from config import Settings
from database import Lead

logger = logging.getLogger(__name__)

TEMPLATE_PATH = Path(__file__).resolve().parent / "templates" / "outreach_email.txt"


class EmailSender:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.template = TEMPLATE_PATH.read_text(encoding="utf-8")

    def send_batch(self, leads: list[Lead]) -> int:
        sent_count = 0
        for lead in leads:
            if sent_count >= self.settings.max_emails_per_run:
                logger.info("Reached MAX_EMAILS_PER_RUN limit (%d)", self.settings.max_emails_per_run)
                break
            if not lead.email:
                continue

            subject, body = self._render_email(lead)
            if self.settings.dry_run:
                logger.info("[DRY RUN] Would email %s <%s>", lead.name, lead.email)
                logger.info("Subject: %s", subject)
                logger.info("Body preview:\n%s", body[:500])
                sent_count += 1
                continue

            self._send_smtp(lead.email, subject, body)
            sent_count += 1
            logger.info("Sent email to %s <%s>", lead.name, lead.email)

            if sent_count < len(leads):
                time.sleep(self.settings.delay_between_emails_seconds)

        return sent_count

    def _render_email(self, lead: Lead) -> tuple[str, str]:
        body = self.template.format(
            business_name=lead.name,
            sender_name=self.settings.from_name,
            reply_to=self.settings.reply_to,
            business_address=self.settings.business_address,
        )
        subject = f"Quick question about {lead.name}'s website"
        return subject, body

    def _send_smtp(self, to_email: str, subject: str, body: str) -> None:
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{self.settings.from_name} <{self.settings.from_email}>"
        message["To"] = to_email
        message["Reply-To"] = self.settings.reply_to
        message.attach(MIMEText(body, "plain", "utf-8"))

        with smtplib.SMTP(self.settings.smtp_host, self.settings.smtp_port) as server:
            server.starttls()
            server.login(self.settings.smtp_user, self.settings.smtp_password)
            server.sendmail(self.settings.from_email, [to_email], message.as_string())
