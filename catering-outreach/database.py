import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass
class Lead:
    place_id: str
    name: str
    address: str
    phone: str | None
    website: str | None
    email: str | None
    status: str
    notes: str | None = None
    id: int | None = None


class LeadDatabase:
    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS leads (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    place_id TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    address TEXT,
                    phone TEXT,
                    website TEXT,
                    email TEXT,
                    status TEXT NOT NULL DEFAULT 'discovered',
                    notes TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    emailed_at TEXT
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS app_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )

    def upsert_lead(self, lead: Lead) -> int:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            existing = conn.execute(
                "SELECT id, status, emailed_at FROM leads WHERE place_id = ?",
                (lead.place_id,),
            ).fetchone()

            if existing:
                preserved_status = existing["status"]
                if preserved_status in {"emailed", "ready", "no_email"}:
                    lead_status = preserved_status
                else:
                    lead_status = lead.status

                conn.execute(
                    """
                    UPDATE leads
                    SET name = ?, address = ?, phone = ?, website = ?,
                        email = COALESCE(?, email), status = ?, notes = COALESCE(notes, ?),
                        updated_at = ?
                    WHERE place_id = ?
                    """,
                    (
                        lead.name,
                        lead.address,
                        lead.phone,
                        lead.website,
                        lead.email,
                        lead_status,
                        lead.notes,
                        now,
                        lead.place_id,
                    ),
                )
                return int(existing["id"])

            cursor = conn.execute(
                """
                INSERT INTO leads (
                    place_id, name, address, phone, website, email,
                    status, notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    lead.place_id,
                    lead.name,
                    lead.address,
                    lead.phone,
                    lead.website,
                    lead.email,
                    lead.status,
                    lead.notes,
                    now,
                    now,
                ),
            )
            return int(cursor.lastrowid)

    def get_leads_by_status(self, status: str) -> list[Lead]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM leads WHERE status = ? ORDER BY name",
                (status,),
            ).fetchall()
        return [self._row_to_lead(row) for row in rows]

    def get_all_leads(self) -> list[Lead]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM leads ORDER BY name").fetchall()
        return [self._row_to_lead(row) for row in rows]

    def get_stats(self) -> dict[str, int]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT status, COUNT(*) as count
                FROM leads
                GROUP BY status
                """
            ).fetchall()
        counts = {row["status"]: row["count"] for row in rows}
        total = sum(counts.values())
        return {
            "total": total,
            "discovered": counts.get("discovered", 0),
            "ready": counts.get("ready", 0),
            "emailed": counts.get("emailed", 0),
            "no_email": counts.get("no_email", 0),
            "unsent": counts.get("ready", 0),
        }

    def get_unsent_leads(self) -> list[Lead]:
        return self.get_leads_by_status("ready")

    def get_setting(self, key: str, default: str = "") -> str:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT value FROM app_settings WHERE key = ?",
                (key,),
            ).fetchone()
        return row["value"] if row else default

    def set_setting(self, key: str, value: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO app_settings (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
                """,
                (key, value, now),
            )

    def lead_to_dict(self, lead: Lead) -> dict:
        return {
            "id": lead.id,
            "name": lead.name,
            "address": lead.address,
            "phone": lead.phone,
            "website": lead.website,
            "email": lead.email,
            "status": lead.status,
            "notes": lead.notes,
        }

    def mark_emailed(self, lead_id: int) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE leads
                SET status = 'emailed', emailed_at = ?, updated_at = ?
                WHERE id = ?
                """,
                (now, now, lead_id),
            )

    def mark_no_email(self, lead_id: int, notes: str | None = None) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE leads
                SET status = 'no_email', notes = ?, updated_at = ?
                WHERE id = ?
                """,
                (notes, now, lead_id),
            )

    def update_email(self, lead_id: int, email: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE leads
                SET email = ?, status = 'ready', updated_at = ?
                WHERE id = ?
                """,
                (email, now, lead_id),
            )

    @staticmethod
    def _row_to_lead(row: sqlite3.Row) -> Lead:
        return Lead(
            id=row["id"],
            place_id=row["place_id"],
            name=row["name"],
            address=row["address"] or "",
            phone=row["phone"],
            website=row["website"],
            email=row["email"],
            status=row["status"],
            notes=row["notes"],
        )
