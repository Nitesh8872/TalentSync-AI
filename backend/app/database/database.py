"""
# WORKFLOW NUMBER
# Shared Infrastructure
#
# PURPOSE
# Configure the SQLite database connection and session lifecycle.
#
# INPUT
# ORM models from backend.app.database.models.
#
# OUTPUT
# Database engine, session factory, startup initialization, and request session dependency.
#
# FLOW DESCRIPTION
# FastAPI startup initializes tables and lightweight migrations. API routes use
# get_db() to receive a SQLAlchemy session, then delegate workflow-specific work
# to the correct workflow service.
"""

import datetime
import logging

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import sessionmaker

from backend.app.core.config import DATABASE_URL
from backend.app.core.constants import DEFAULT_APPLICATION_STATUS
from backend.app.database.models import Base

logger = logging.getLogger(__name__)


# ==================================================
# SHARED DATABASE CONNECTION
# Purpose:
# Create the SQLite engine and session factory used by all workflows.
#
# Flow:
# FastAPI Request
# -> get_db()
# -> SQLAlchemy Session
# -> Workflow Service
# ==================================================
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@event.listens_for(engine, "connect")
def enable_sqlite_foreign_keys(dbapi_connection, connection_record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


# ==================================================
# Function: _migrate_schema()
#
# Purpose:
# Apply safe schema upgrades for already-created local SQLite databases.
#
# Steps:
# 1. Inspect existing tables.
# 2. Add resumes.parsed_data if missing.
# 3. Add users.role if missing.
# 4. Add optional Workflow 5 parsed job-description fields if missing.
# 5. Leave existing data untouched.
# ==================================================
def _migrate_schema() -> None:
    inspector = inspect(engine)

    if inspector.has_table("resumes"):
        resume_columns = {col["name"] for col in inspector.get_columns("resumes")}
        if "candidate_id" not in resume_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE resumes ADD COLUMN candidate_id INTEGER"))
            logger.info("Migration applied: added resumes.candidate_id column")
        with engine.begin() as conn:
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_resumes_candidate_id ON resumes (candidate_id)"))
        if "parsed_data" not in resume_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE resumes ADD COLUMN parsed_data TEXT"))
            logger.info("Migration applied: added resumes.parsed_data column")
        _backfill_single_candidate_owner(table_name="resumes", owner_column="candidate_id")

    if inspector.has_table("users"):
        user_columns = {col["name"] for col in inspector.get_columns("users")}
        if "role" not in user_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR NOT NULL DEFAULT 'candidate'"))
            logger.info("Migration applied: added users.role column")
        if "profile_image_url" not in user_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN profile_image_url VARCHAR NULL"))
            logger.info("Migration applied: added users.profile_image_url column")

    if inspector.has_table("job_descriptions"):
        job_columns = {col["name"] for col in inspector.get_columns("job_descriptions")}
        job_description_columns = {
            "candidate_id": "INTEGER",
            "recruiter_id": "INTEGER",
            "job_title": "VARCHAR",
            "required_skills": "TEXT",
            "preferred_skills": "TEXT",
            "experience_required": "INTEGER",
            "education_required": "VARCHAR",
            "parsed_job_data": "TEXT",
            "skills_version": "VARCHAR",
        }
        with engine.begin() as conn:
            for column_name, column_type in job_description_columns.items():
                if column_name not in job_columns:
                    conn.execute(text(f"ALTER TABLE job_descriptions ADD COLUMN {column_name} {column_type}"))
                    logger.info("Migration applied: added job_descriptions.%s column", column_name)
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_job_descriptions_candidate_id ON job_descriptions (candidate_id)"))
        _backfill_single_candidate_owner(table_name="job_descriptions", owner_column="candidate_id")

    if inspector.has_table("jobs"):
        job_columns = {col["name"] for col in inspector.get_columns("jobs")}
        optional_job_columns = {
            "company_name": "VARCHAR",
            "employment_type": "VARCHAR",
            "location": "VARCHAR",
            "salary_range": "VARCHAR",
            "application_deadline": "DATE",
        }
        with engine.begin() as conn:
            for column_name, column_type in optional_job_columns.items():
                if column_name not in job_columns:
                    conn.execute(text(f"ALTER TABLE jobs ADD COLUMN {column_name} {column_type}"))
                    logger.info("Migration applied: added jobs.%s column", column_name)
        if "status" not in job_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN status VARCHAR NOT NULL DEFAULT 'ACTIVE'"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_jobs_status ON jobs (status)"))
            logger.info("Migration applied: added jobs.status column")

    _migrate_applications_schema(inspector)


def _backfill_single_candidate_owner(table_name: str, owner_column: str) -> None:
    """Backfill legacy unscoped candidate rows only when ownership is unambiguous."""
    with engine.begin() as conn:
        candidate_ids = [
            row[0]
            for row in conn.execute(text("SELECT id FROM users WHERE role = 'candidate' ORDER BY id")).fetchall()
        ]
        if len(candidate_ids) != 1:
            legacy_count = conn.execute(
                text(f"SELECT COUNT(*) FROM {table_name} WHERE {owner_column} IS NULL")
            ).scalar_one()
            if legacy_count:
                logger.warning(
                    "Found %s legacy %s rows with NULL %s; leaving unscoped rows inaccessible.",
                    legacy_count,
                    table_name,
                    owner_column,
                )
            return
        result = conn.execute(
            text(f"UPDATE {table_name} SET {owner_column} = :candidate_id WHERE {owner_column} IS NULL"),
            {"candidate_id": candidate_ids[0]},
        )
        if result.rowcount:
            logger.info(
                "Migration applied: backfilled %s legacy %s.%s rows to candidate_id=%s",
                result.rowcount,
                table_name,
                owner_column,
                candidate_ids[0],
            )


def _migrate_applications_schema(inspector) -> None:
    required_columns = {"id", "candidate_id", "recruiter_id", "job_id", "application_status", "applied_at"}

    if inspector.has_table("applications"):
        application_columns = {col["name"] for col in inspector.get_columns("applications")}
        if required_columns.issubset(application_columns):
            optional_columns = {
                "resume_id": "INTEGER REFERENCES resumes(id)",
                "match_score": "INTEGER",
                "matched_skills": "TEXT",
                "missing_skills": "TEXT",
            }
            with engine.begin() as conn:
                for column_name, column_type in optional_columns.items():
                    if column_name not in application_columns:
                        conn.execute(text(f"ALTER TABLE applications ADD COLUMN {column_name} {column_type}"))
                        logger.info("Migration applied: added applications.%s column", column_name)
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_applications_resume_id ON applications (resume_id)"))
            return

        legacy_table = f"applications_legacy_{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE applications RENAME TO {legacy_table}"))
        logger.info("Migration applied: preserved old applications table as %s", legacy_table)

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS applications (
                    id INTEGER NOT NULL,
                    candidate_id INTEGER NOT NULL,
                    recruiter_id INTEGER NOT NULL,
                    job_id INTEGER NOT NULL,
                    resume_id INTEGER,
                    match_score INTEGER,
                    matched_skills TEXT,
                    missing_skills TEXT,
                    application_status VARCHAR NOT NULL DEFAULT '{default_status}',
                    applied_at DATETIME,
                    PRIMARY KEY (id),
                    CONSTRAINT uq_application_candidate_job UNIQUE (candidate_id, job_id),
                    FOREIGN KEY(candidate_id) REFERENCES users (id),
                    FOREIGN KEY(recruiter_id) REFERENCES recruiters (id),
                    FOREIGN KEY(job_id) REFERENCES jobs (id),
                    FOREIGN KEY(resume_id) REFERENCES resumes (id)
                )
                """.format(default_status=DEFAULT_APPLICATION_STATUS)
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_applications_candidate_id ON applications (candidate_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_applications_recruiter_id ON applications (recruiter_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_applications_job_id ON applications (job_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_applications_resume_id ON applications (resume_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_applications_applied_at ON applications (applied_at)"))
    logger.info("Migration applied: created Workflow 13 applications table")


# ==================================================
# Function: init_db()
#
# Purpose:
# Create database tables and run non-destructive local migrations.
#
# Steps:
# 1. Create all ORM tables if they do not exist.
# 2. Apply lightweight schema migrations.
# 3. Return control to FastAPI startup.
# ==================================================
def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _migrate_schema()


# ==================================================
# Function: get_db()
#
# Purpose:
# Provide one request-scoped database session to API routes.
#
# Steps:
# 1. Open a SQLAlchemy session.
# 2. Yield it to the route.
# 3. Close it after the request finishes.
# ==================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
