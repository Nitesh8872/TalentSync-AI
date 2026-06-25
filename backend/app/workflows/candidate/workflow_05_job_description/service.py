"""
# WORKFLOW NUMBER
# WORKFLOW 5 — CANDIDATE JOB DESCRIPTION SUBMISSION
#
# PURPOSE
# Save and list submitted job descriptions.
#
# INPUT
# JobDescriptionRequest data and database session.
#
# OUTPUT
# Saved JobDescription rows and job-history payloads.
#
# FLOW DESCRIPTION
# Job Description Form -> Validate Text -> Parse Metadata -> Save Row -> Return Confirmation.
"""

from typing import Any

from sqlalchemy.orm import Session

from backend.app.database.models import JobDescription
from backend.app.services.job_parser import (
    parse_job_description,
    parsed_job_data_from_json,
    parsed_job_data_to_json,
    skills_to_json,
)
from backend.app.workflows.candidate.workflow_05_job_description.schema import (
    JobDescriptionRequest,
)


# ==================================================
# Function: save_candidate_job_description()
#
# Purpose:
# Save a submitted job description for Workflow 5.
#
# Steps:
# 1. Strip whitespace from title and description.
# 2. Reject blank values.
# 3. Extract structured job metadata without changing raw text storage.
# 4. Insert the job description row with raw and parsed data.
# 5. Return the saved row.
# ==================================================
def save_candidate_job_description(payload: JobDescriptionRequest, db: Session, candidate_id: int) -> JobDescription:
    title = payload.title.strip()
    description = payload.description.strip()

    if not title:
        raise ValueError("Title cannot be empty")
    if not description:
        raise ValueError("Description cannot be empty")

    parsed_job_data = parse_job_description(title=title, description=description)
    db_job = JobDescription(
        candidate_id=candidate_id,
        title=title,
        description=description,
        job_title=parsed_job_data["job_title"],
        required_skills=skills_to_json(parsed_job_data["required_skills"]),
        preferred_skills=skills_to_json(parsed_job_data["preferred_skills"]),
        experience_required=parsed_job_data["experience_required"],
        education_required=parsed_job_data["education_required"],
        parsed_job_data=parsed_job_data_to_json(parsed_job_data),
        skills_version=parsed_job_data["skills_version"],
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job


# ==================================================
# Function: list_candidate_job_descriptions()
#
# Purpose:
# Return saved job descriptions for Workflow 5 history display.
#
# Steps:
# 1. Query all job description rows newest-first.
# 2. Convert each row into an API-safe dictionary.
# 3. Return the history list.
# ==================================================
def list_candidate_job_descriptions(db: Session, candidate_id: int) -> list[dict[str, Any]]:
    jobs = (
        db.query(JobDescription)
        .filter(JobDescription.candidate_id == candidate_id)
        .order_by(JobDescription.id.desc())
        .all()
    )
    return [
        {
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "created_at": job.created_at.isoformat(),
            "parsed_job_data": parsed_job_data_from_json(job.parsed_job_data),
        }
        for job in jobs
    ]


def delete_candidate_job_description(goal_id: int, db: Session, candidate_id: int) -> int:
    """Delete one career goal only when it belongs to the authenticated candidate."""
    goal = (
        db.query(JobDescription)
        .filter(
            JobDescription.id == goal_id,
            JobDescription.candidate_id == candidate_id,
        )
        .first()
    )
    if not goal:
        raise LookupError("Career goal not found")

    db.delete(goal)
    db.commit()
    return goal_id
