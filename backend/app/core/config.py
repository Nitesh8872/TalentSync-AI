"""Filesystem and application configuration."""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = PROJECT_ROOT / "data"
DATABASE_PATH = DATA_DIR / "resumes.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
FRONTEND_DIR = PROJECT_ROOT / "frontend"

APP_TITLE = "TalentSync AI - Resume Upload & Parsing System"
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
