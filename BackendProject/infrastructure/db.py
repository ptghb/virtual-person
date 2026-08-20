# -*- coding: utf-8 -*-
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "app.db"


def ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    ensure_data_dir()
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


@contextmanager
def db_cursor(commit: bool = False) -> Iterator[sqlite3.Cursor]:
    connection = get_connection()
    cursor = connection.cursor()
    try:
        yield cursor
        if commit:
            connection.commit()
    finally:
        cursor.close()
        connection.close()


def init_db() -> None:
    ensure_data_dir()
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              display_name TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS companions (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              base_personality TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS conversation_sessions (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              companion_id TEXT NOT NULL,
              mode TEXT NOT NULL,
              latest_summary TEXT,
              metadata_json TEXT,
              started_at TEXT NOT NULL,
              ended_at TEXT,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id),
              FOREIGN KEY (companion_id) REFERENCES companions(id)
            );

            CREATE TABLE IF NOT EXISTS memory_items (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              companion_id TEXT NOT NULL,
              session_id TEXT,
              memory_type TEXT NOT NULL,
              status TEXT NOT NULL,
              scope TEXT NOT NULL DEFAULT 'user',
              title TEXT,
              content TEXT NOT NULL,
              normalized_json TEXT,
              importance INTEGER NOT NULL DEFAULT 3,
              confidence REAL NOT NULL DEFAULT 0.8,
              recall_count INTEGER NOT NULL DEFAULT 0,
              source_type TEXT NOT NULL,
              source_ref TEXT,
              ttl_at TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              deleted_at TEXT,
              FOREIGN KEY (user_id) REFERENCES users(id),
              FOREIGN KEY (companion_id) REFERENCES companions(id),
              FOREIGN KEY (session_id) REFERENCES conversation_sessions(id)
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_user_companion
            ON conversation_sessions(user_id, companion_id, updated_at DESC);

            CREATE INDEX IF NOT EXISTS idx_memory_active
            ON memory_items(user_id, companion_id, status, memory_type, updated_at DESC);
            """
        )
        connection.commit()
