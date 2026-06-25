"""Candidate-scoped access to the authoritative latest parsed resume."""

from typing import Any

from sqlalchemy.orm import Session

from backend.app.database.models import Resume
from backend.app.workflows.candidate.workflow_04_resume_parsing.service import (
    ensure_parsed_resume_data,
)


def newest_resume_ordering():
    return (Resume.upload_time.desc(), Resume.id.desc())


def get_latest_candidate_resume(candidate_id: int, db: Session) -> Resume | None:
    """Return the newest persisted resume for a candidate."""
    return (
        db.query(Resume)
        .filter(Resume.candidate_id == candidate_id)
        .order_by(*newest_resume_ordering())
        .first()
    )


def get_latest_candidate_resume_payload(candidate_id: int, db: Session) -> dict[str, Any] | None:
    """Return the shared frontend contract for the latest parsed resume."""
    resume = get_latest_candidate_resume(candidate_id=candidate_id, db=db)
    if not resume:
        return None

    try:
        parsed = ensure_parsed_resume_data(resume=resume, db=db)
        status = "parsed"
    except (TypeError, ValueError):
        parsed = {}
        status = "failed"

    contact = parsed.get("personal_information") or parsed.get("contact") or {}
    return {
        "resume_id": resume.id,
        "candidate_id": candidate_id,
        "file_name": resume.filename,
        "parsed_name": parsed.get("name") or contact.get("full_name") or None,
        "email": contact.get("email") or None,
        "phone": contact.get("phone") or None,
        "skills": parsed.get("all_skills_flat") or parsed.get("skills") or [],
        "projects": parsed.get("project_details") or parsed.get("projects") or [],
        "education": parsed.get("education") or [],
        "experience": parsed.get("work_experience") or parsed.get("experience") or [],
        "uploaded_at": resume.upload_time.isoformat(),
        "parsed_status": status,
        "parsed_data": parsed,
    }
