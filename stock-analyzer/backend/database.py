import sqlite3
import json
import time
from pathlib import Path
from config import DB_PATH, CACHE_DURATION_MINUTES


def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS cache (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            expires_at REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS watchlist (
            ticker TEXT PRIMARY KEY,
            name TEXT,
            added_at REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS analysis_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT NOT NULL,
            analysis TEXT NOT NULL,
            created_at REAL NOT NULL
        );
    """)
    conn.commit()
    conn.close()


def cache_get(key: str):
    conn = _get_conn()
    row = conn.execute(
        "SELECT value, expires_at FROM cache WHERE key = ?", (key,)
    ).fetchone()
    conn.close()
    if row and row["expires_at"] > time.time():
        return json.loads(row["value"])
    return None


def cache_set(key: str, value, ttl_minutes: int = CACHE_DURATION_MINUTES):
    conn = _get_conn()
    expires_at = time.time() + ttl_minutes * 60
    conn.execute(
        "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
        (key, json.dumps(value, default=str), expires_at),
    )
    conn.commit()
    conn.close()


def cache_clear_expired():
    conn = _get_conn()
    conn.execute("DELETE FROM cache WHERE expires_at <= ?", (time.time(),))
    conn.commit()
    conn.close()


def watchlist_add(ticker: str, name: str = ""):
    conn = _get_conn()
    conn.execute(
        "INSERT OR IGNORE INTO watchlist (ticker, name, added_at) VALUES (?, ?, ?)",
        (ticker, name, time.time()),
    )
    conn.commit()
    conn.close()


def watchlist_remove(ticker: str):
    conn = _get_conn()
    conn.execute("DELETE FROM watchlist WHERE ticker = ?", (ticker,))
    conn.commit()
    conn.close()


def watchlist_get() -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT ticker, name, added_at FROM watchlist ORDER BY added_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def save_analysis(ticker: str, analysis: dict):
    conn = _get_conn()
    conn.execute(
        "INSERT INTO analysis_history (ticker, analysis, created_at) VALUES (?, ?, ?)",
        (ticker, json.dumps(analysis, default=str), time.time()),
    )
    conn.commit()
    conn.close()


def get_analysis_history(ticker: str, limit: int = 10) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT analysis, created_at FROM analysis_history "
        "WHERE ticker = ? ORDER BY created_at DESC LIMIT ?",
        (ticker, limit),
    ).fetchall()
    conn.close()
    return [{"analysis": json.loads(r["analysis"]), "created_at": r["created_at"]} for r in rows]


init_db()
