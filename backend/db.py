"""Database initialization and connection helpers for StudyHub.

Uses SQLite (stdlib) with the recommended approach of opening a fresh
connection per request via `get_db()`. The schema is idempotent and runs
on application startup, so the database file is created automatically.
"""

import os
import sqlite3
from flask import g, current_app

DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "studyhub.db")


def get_db() -> sqlite3.Connection:
    """Return a per-request SQLite connection. Rows are dict-like."""
    if "db" not in g:
        db_path = current_app.config.get("DATABASE", DEFAULT_DB_PATH)
        g.db = sqlite3.connect(db_path)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(_exc=None) -> None:
    """Close the DB connection at the end of each request."""
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db(db_path: str | None = None) -> None:
    """Create tables if they do not already exist. Safe to call multiple times."""
    if db_path is None:
        db_path = DEFAULT_DB_PATH
    conn = sqlite3.connect(db_path)
    try:
        conn.executescript(
            """
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS subjects (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT    NOT NULL,
                description TEXT    NOT NULL DEFAULT '',
                color       TEXT    NOT NULL DEFAULT '#6366f1',
                created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT    NOT NULL,
                description TEXT    NOT NULL DEFAULT '',
                subject_id  INTEGER,
                due_date    TEXT,
                priority    TEXT    NOT NULL DEFAULT 'Medium',
                completed   INTEGER NOT NULL DEFAULT 0,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS idx_tasks_subject ON tasks(subject_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
            CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
            """
        )
        conn.commit()
    finally:
        conn.close()
