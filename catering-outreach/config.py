import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _require(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def _bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    search_location: str
    search_radius_meters: int
    search_lat: float | None
    search_lng: float | None
    google_places_api_key: str
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    from_name: str
    from_email: str
    reply_to: str
    business_address: str
    dry_run: bool
    max_emails_per_run: int
    delay_between_emails_seconds: int
    search_queries: list[str]
    db_path: Path
    exports_dir: Path

    @classmethod
    def load(cls) -> "Settings":
        lat_raw = os.getenv("SEARCH_LAT", "").strip()
        lng_raw = os.getenv("SEARCH_LNG", "").strip()
        search_lat = float(lat_raw) if lat_raw else None
        search_lng = float(lng_raw) if lng_raw else None

        queries_raw = os.getenv(
            "SEARCH_QUERIES",
            "catering,catering company,event catering,wedding catering",
        )
        search_queries = [q.strip() for q in queries_raw.split(",") if q.strip()]

        return cls(
            search_location=_require("SEARCH_LOCATION"),
            search_radius_meters=int(os.getenv("SEARCH_RADIUS_METERS", "15000")),
            search_lat=search_lat,
            search_lng=search_lng,
            google_places_api_key=_require("GOOGLE_PLACES_API_KEY"),
            smtp_host=os.getenv("SMTP_HOST", "smtp.gmail.com"),
            smtp_port=int(os.getenv("SMTP_PORT", "587")),
            smtp_user=_require("SMTP_USER"),
            smtp_password=_require("SMTP_PASSWORD"),
            from_name=os.getenv("FROM_NAME", "Web Services"),
            from_email=_require("FROM_EMAIL"),
            reply_to=os.getenv("REPLY_TO", os.getenv("FROM_EMAIL", "")),
            business_address=_require("BUSINESS_ADDRESS"),
            dry_run=_bool("DRY_RUN", default=True),
            max_emails_per_run=int(os.getenv("MAX_EMAILS_PER_RUN", "10")),
            delay_between_emails_seconds=int(os.getenv("DELAY_BETWEEN_EMAILS_SECONDS", "30")),
            search_queries=search_queries,
            db_path=BASE_DIR / "leads.db",
            exports_dir=BASE_DIR / "exports",
        )
