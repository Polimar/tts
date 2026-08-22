import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Generator, Optional

from tts_server.config import settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


class Database:
    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self._lock = threading.RLock()
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    @contextmanager
    def connect(self) -> Generator[sqlite3.Connection, None, None]:
        with self._lock:
            conn = sqlite3.connect(self.db_path, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            try:
                yield conn
                conn.commit()
            finally:
                conn.close()

    def _init_schema(self) -> None:
        with self.connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS sessions (
                    token TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS voices (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    ref_text TEXT NOT NULL,
                    audio_rel_path TEXT NOT NULL,
                    language TEXT NOT NULL DEFAULT 'Italian',
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    voice_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    language TEXT NOT NULL,
                    text TEXT NOT NULL,
                    chunk_count INTEGER NOT NULL DEFAULT 0,
                    error TEXT,
                    wav_rel_path TEXT,
                    mp3_rel_path TEXT,
                    device_used TEXT,
                    created_at TEXT NOT NULL,
                    started_at TEXT,
                    completed_at TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (voice_id) REFERENCES voices(id)
                );

                CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
                CREATE INDEX IF NOT EXISTS idx_voices_user ON voices(user_id);
                CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);
                CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
                """
            )

    def create_user(self, user_id: str, username: str, password_hash: str) -> dict[str, Any]:
        now = _iso(utcnow())
        with self.connect() as conn:
            conn.execute(
                "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (user_id, username, password_hash, now),
            )
        return {"id": user_id, "username": username, "created_at": now}

    def get_user_by_username(self, username: str) -> Optional[dict[str, Any]]:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE username = ?",
                (username,),
            ).fetchone()
        return dict(row) if row else None

    def get_user_by_id(self, user_id: str) -> Optional[dict[str, Any]]:
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None

    def create_session(self, token: str, user_id: str, expires_at: datetime) -> None:
        now = _iso(utcnow())
        with self.connect() as conn:
            conn.execute(
                "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
                (token, user_id, _iso(expires_at), now),
            )

    def delete_session(self, token: str) -> None:
        with self.connect() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))

    def get_session(self, token: str) -> Optional[dict[str, Any]]:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM sessions WHERE token = ?",
                (token,),
            ).fetchone()
        if not row:
            return None
        expires = datetime.fromisoformat(row["expires_at"])
        if expires < utcnow():
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            return None
        return dict(row)

    def create_voice(
        self,
        voice_id: str,
        user_id: str,
        name: str,
        ref_text: str,
        audio_rel_path: str,
        language: str,
    ) -> dict[str, Any]:
        now = _iso(utcnow())
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO voices (id, user_id, name, ref_text, audio_rel_path, language, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (voice_id, user_id, name, ref_text, audio_rel_path, language, now),
            )
        return {
            "id": voice_id,
            "user_id": user_id,
            "name": name,
            "ref_text": ref_text,
            "audio_rel_path": audio_rel_path,
            "language": language,
            "created_at": now,
        }

    def list_voices(self, user_id: str) -> list[dict[str, Any]]:
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM voices WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    def get_voice(self, voice_id: str, user_id: str) -> Optional[dict[str, Any]]:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM voices WHERE id = ? AND user_id = ?",
                (voice_id, user_id),
            ).fetchone()
        return dict(row) if row else None

    def delete_voice(self, voice_id: str, user_id: str) -> bool:
        with self.connect() as conn:
            cur = conn.execute(
                "DELETE FROM voices WHERE id = ? AND user_id = ?",
                (voice_id, user_id),
            )
        return cur.rowcount > 0

    def create_job(
        self,
        job_id: str,
        user_id: str,
        voice_id: str,
        language: str,
        text: str,
    ) -> dict[str, Any]:
        now = _iso(utcnow())
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO jobs (
                    id, user_id, voice_id, status, language, text,
                    chunk_count, created_at
                ) VALUES (?, ?, ?, 'queued', ?, ?, 0, ?)
                """,
                (job_id, user_id, voice_id, language, text, now),
            )
        return self.get_job(job_id, user_id)

    def get_job(self, job_id: str, user_id: str) -> Optional[dict[str, Any]]:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM jobs WHERE id = ? AND user_id = ?",
                (job_id, user_id),
            ).fetchone()
        return dict(row) if row else None

    def list_jobs(self, user_id: str) -> list[dict[str, Any]]:
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    def claim_next_queued_job(self) -> Optional[dict[str, Any]]:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1"
            ).fetchone()
            if not row:
                return None
            now = _iso(utcnow())
            conn.execute(
                "UPDATE jobs SET status = 'running', started_at = ? WHERE id = ? AND status = 'queued'",
                (now, row["id"]),
            )
            updated = conn.execute("SELECT * FROM jobs WHERE id = ?", (row["id"],)).fetchone()
        return dict(updated) if updated else None

    def update_job(
        self,
        job_id: str,
        *,
        status: Optional[str] = None,
        chunk_count: Optional[int] = None,
        error: Optional[str] = None,
        wav_rel_path: Optional[str] = None,
        mp3_rel_path: Optional[str] = None,
        device_used: Optional[str] = None,
        completed: bool = False,
    ) -> None:
        fields: list[str] = []
        values: list[Any] = []
        if status is not None:
            fields.append("status = ?")
            values.append(status)
        if chunk_count is not None:
            fields.append("chunk_count = ?")
            values.append(chunk_count)
        if error is not None:
            fields.append("error = ?")
            values.append(error)
        if wav_rel_path is not None:
            fields.append("wav_rel_path = ?")
            values.append(wav_rel_path)
        if mp3_rel_path is not None:
            fields.append("mp3_rel_path = ?")
            values.append(mp3_rel_path)
        if device_used is not None:
            fields.append("device_used = ?")
            values.append(device_used)
        if completed:
            fields.append("completed_at = ?")
            values.append(_iso(utcnow()))
        if not fields:
            return
        values.append(job_id)
        with self.connect() as conn:
            conn.execute(f"UPDATE jobs SET {', '.join(fields)} WHERE id = ?", values)


_db: Optional[Database] = None


def get_db() -> Database:
    global _db
    if _db is None:
        settings.ensure_data_dir()
        _db = Database(settings.db_path)
    return _db
