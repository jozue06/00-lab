import logging
import re
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

EMAIL_PATTERN = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
    re.IGNORECASE,
)

IGNORED_EMAIL_SUFFIXES = (
    "example.com",
    "sentry.io",
    "wixpress.com",
    "schema.org",
    "googleusercontent.com",
    "png",
    "jpg",
    "jpeg",
    "gif",
    "svg",
    "webp",
)

CONTACT_PATHS = (
    "/contact",
    "/contact-us",
    "/contactus",
    "/about",
    "/about-us",
    "/get-in-touch",
)


class EmailFinder:
    def __init__(self, timeout: int = 15) -> None:
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (compatible; CateringOutreachBot/1.0; "
                    "+https://example.com/bot)"
                )
            }
        )

    def find_email(self, website: str | None) -> str | None:
        if not website:
            return None

        normalized = self._normalize_url(website)
        if not normalized:
            return None

        candidates: list[str] = []
        pages_to_check = [normalized]
        pages_to_check.extend(urljoin(normalized, path) for path in CONTACT_PATHS)

        checked: set[str] = set()
        for page_url in pages_to_check:
            if page_url in checked:
                continue
            checked.add(page_url)

            emails = self._extract_emails_from_page(page_url)
            candidates.extend(emails)
            if candidates:
                break

        return self._pick_best_email(candidates)

    def _normalize_url(self, website: str) -> str | None:
        website = website.strip()
        if not website:
            return None
        if not website.startswith(("http://", "https://")):
            website = f"https://{website}"
        parsed = urlparse(website)
        if not parsed.netloc:
            return None
        return f"{parsed.scheme}://{parsed.netloc}"

    def _extract_emails_from_page(self, url: str) -> list[str]:
        try:
            response = self.session.get(url, timeout=self.timeout, allow_redirects=True)
            if response.status_code >= 400:
                return []
        except requests.RequestException as exc:
            logger.debug("Could not fetch %s: %s", url, exc)
            return []

        emails: list[str] = []
        soup = BeautifulSoup(response.text, "html.parser")

        for anchor in soup.select("a[href^=mailto:]"):
            href = anchor.get("href", "")
            email = href.split("mailto:", 1)[-1].split("?", 1)[0].strip()
            if email:
                emails.append(email)

        for match in EMAIL_PATTERN.findall(response.text):
            emails.append(match)

        return [email.lower() for email in emails if self._is_valid_email(email)]

    @staticmethod
    def _is_valid_email(email: str) -> bool:
        email = email.lower().strip()
        if "@" not in email:
            return False
        local, domain = email.rsplit("@", 1)
        if not local or not domain or "." not in domain:
            return False
        if any(domain.endswith(suffix) for suffix in IGNORED_EMAIL_SUFFIXES):
            return False
        if email.endswith((".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp")):
            return False
        return True

    @staticmethod
    def _pick_best_email(emails: list[str]) -> str | None:
        if not emails:
            return None

        priority_prefixes = ("info@", "contact@", "hello@", "sales@", "catering@", "events@")
        for prefix in priority_prefixes:
            for email in emails:
                if email.startswith(prefix):
                    return email

        return emails[0]
