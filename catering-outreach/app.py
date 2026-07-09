from __future__ import annotations

import logging
import threading
from typing import Any

from flask import Flask, jsonify, render_template, request

from config import Settings
from database import LeadDatabase
from services import (
    find_emails,
    get_email_templates,
    preview_email,
    save_email_templates,
    scan_businesses,
    send_unsent_emails,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)

app = Flask(__name__)
settings: Settings | None = None
db: LeadDatabase | None = None

job_lock = threading.Lock()
job_state: dict[str, Any] = {
    "running": False,
    "task": None,
    "message": "",
    "error": None,
    "result": None,
}


def init_app() -> None:
    global settings, db
    settings = Settings.load()
    db = LeadDatabase(settings.db_path)


def _require_db() -> LeadDatabase:
    if db is None:
        raise RuntimeError("App not initialized")
    return db


def _require_settings() -> Settings:
    if settings is None:
        raise RuntimeError("App not initialized")
    return settings


def _run_job(task_name: str, worker) -> tuple[bool, str]:
    with job_lock:
        if job_state["running"]:
            return False, f"Already running: {job_state['task']}"
        job_state.update(
            {
                "running": True,
                "task": task_name,
                "message": f"Running {task_name}...",
                "error": None,
                "result": None,
            }
        )

    def runner() -> None:
        try:
            result = worker()
            with job_lock:
                job_state["result"] = result
                job_state["message"] = f"{task_name} complete"
        except Exception as exc:
            logging.exception("%s failed", task_name)
            with job_lock:
                job_state["error"] = str(exc)
                job_state["message"] = f"{task_name} failed"
        finally:
            with job_lock:
                job_state["running"] = False
                job_state["task"] = None

    threading.Thread(target=runner, daemon=True).start()
    return True, f"Started {task_name}"


@app.route("/")
def dashboard() -> str:
    return render_template("dashboard.html")


@app.get("/api/status")
def api_status():
    current_settings = _require_settings()
    current_db = _require_db()
    stats = current_db.get_stats()
    templates = get_email_templates(current_db)

    with job_lock:
        job = {
            "running": job_state["running"],
            "task": job_state["task"],
            "message": job_state["message"],
            "error": job_state["error"],
            "result": job_state["result"],
        }

    return jsonify(
        {
            "stats": stats,
            "settings": {
                "locations": current_settings.search_locations,
                "dry_run": current_settings.dry_run,
                "max_emails_per_run": current_settings.max_emails_per_run,
            },
            "email_template": templates,
            "job": job,
        }
    )


@app.get("/api/leads")
def api_leads():
    current_db = _require_db()
    status = request.args.get("status", "all")
    leads = current_db.get_all_leads()
    if status != "all":
        leads = [lead for lead in leads if lead.status == status]
    return jsonify([current_db.lead_to_dict(lead) for lead in leads])


@app.post("/api/scan")
def api_scan():
    current_settings = _require_settings()
    current_db = _require_db()

    def worker():
        count = scan_businesses(current_settings, current_db)
        return {"scanned": count}

    ok, message = _run_job("scan", worker)
    return jsonify({"ok": ok, "message": message}), (202 if ok else 409)


@app.post("/api/find-emails")
def api_find_emails():
    current_db = _require_db()

    def worker():
        return find_emails(current_db)

    ok, message = _run_job("find-emails", worker)
    return jsonify({"ok": ok, "message": message}), (202 if ok else 409)


@app.post("/api/send")
def api_send():
    current_settings = _require_settings()
    current_db = _require_db()

    def worker():
        return send_unsent_emails(current_settings, current_db)

    ok, message = _run_job("send", worker)
    return jsonify({"ok": ok, "message": message}), (202 if ok else 409)


@app.put("/api/email-template")
def api_save_template():
    current_db = _require_db()
    data = request.get_json(silent=True) or {}
    subject = data.get("subject", "").strip()
    body = data.get("body", "").strip()
    if not subject or not body:
        return jsonify({"ok": False, "message": "Subject and body are required"}), 400

    save_email_templates(current_db, subject, body)
    return jsonify({"ok": True, "message": "Email template saved"})


@app.post("/api/preview")
def api_preview():
    current_settings = _require_settings()
    current_db = _require_db()
    data = request.get_json(silent=True) or {}

    subject = data.get("subject")
    body = data.get("body")
    if subject and body:
        save_email_templates(current_db, subject, body)

    preview = preview_email(
        current_settings,
        current_db,
        lead_name=data.get("business_name"),
    )
    return jsonify(preview)


@app.errorhandler(Exception)
def handle_error(exc):
    logging.exception("Request failed")
    return jsonify({"ok": False, "message": str(exc)}), 500


if __name__ == "__main__":
    init_app()
    app.run(host="127.0.0.1", port=5000, debug=False)
