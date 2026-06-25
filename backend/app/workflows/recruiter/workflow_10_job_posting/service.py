"""
# WORKFLOW NUMBER
# WORKFLOW 10 - JOB POSTING
#
# PURPOSE
# Create recruiter-owned jobs and serialize job records.
#
# INPUT
# Recruiter id, validated job payload, and database session.
#
# OUTPUT
# Saved Job rows for recruiter and candidate job APIs.
#
# FLOW DESCRIPTION
# Recruiter Dashboard -> Create Job -> Validate Recruiter -> Save Job -> Return Job.
"""

import json
from typing import Any

from sqlalchemy.orm import Session

from backend.app.database.models import Job, Recruiter
from backend.app.workflows.recruiter.workflow_10_job_posting.schema import (
    JobCreateRequest,
    RecruiterJobCreateRequest,
)


def get_recruiter_or_raise(recruiter_id: int, db: Session) -> Recruiter:
    recruiter = db.query(Recruiter).filter(Recruiter.id == recruiter_id).first()
    if not recruiter:
        raise ValueError("Authenticated recruiter not found")
    return recruiter


def serialize_job(job: Job) -> dict[str, Any]:
    return {
        "job_id": job.id,
        "recruiter_id": job.recruiter_id,
        "title": job.title,
        "skills": skills_from_json(job.skills),
        "experience": job.experience,
        "description": job.description,
        "company_name": job.company_name,
        "employment_type": job.employment_type,
        "location": job.location,
        "salary_range": job.salary_range,
        "application_deadline": job.application_deadline,
        "created_at": job.created_at,
    }


def skills_to_json(skills: list[str]) -> str:
    return json.dumps(skills, ensure_ascii=False)


def skills_from_json(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        parsed = [value]
    if not isinstance(parsed, list):
        return []
    return [str(skill).strip() for skill in parsed if str(skill).strip()]


def create_recruiter_job(
    recruiter_id: int,
    payload: RecruiterJobCreateRequest,
    db: Session,
) -> Job:
    recruiter = get_recruiter_or_raise(recruiter_id=recruiter_id, db=db)
    normalized = JobCreateRequest(
        title=payload.job_title,
        skills=payload.required_skills,
        experience=payload.experience_required,
        description=payload.job_description,
    )
    job = Job(
        recruiter_id=recruiter.id,
        title=payload.job_title,
        skills=skills_to_json(normalized.skills),
        experience=payload.experience_required,
        description=payload.job_description,
        company_name=payload.company_name or recruiter.company_name,
        employment_type=payload.employment_type,
        location=payload.location,
        salary_range=payload.salary_range,
        application_deadline=payload.application_deadline,
        status="ACTIVE",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def list_recruiter_jobs(recruiter_id: int, db: Session) -> list[dict[str, Any]]:
    recruiter = get_recruiter_or_raise(recruiter_id=recruiter_id, db=db)
    jobs = db.query(Job).filter(Job.recruiter_id == recruiter_id).order_by(Job.id.desc()).all()
    return [serialize_legacy_recruiter_job(job=job, recruiter=recruiter) for job in jobs]


def get_recruiter_job(job_id: int, recruiter_id: int, db: Session) -> dict[str, Any]:
    recruiter = get_recruiter_or_raise(recruiter_id=recruiter_id, db=db)
    job = db.query(Job).filter(Job.id == job_id, Job.recruiter_id == recruiter_id).first()
    if not job:
        raise ValueError("Job posting not found")
    return serialize_legacy_recruiter_job(job=job, recruiter=recruiter)


def serialize_recruiter_job(job: Job) -> dict[str, Any]:
    return serialize_legacy_recruiter_job(job=job)


def serialize_legacy_recruiter_job(job: Job, recruiter: Recruiter | None = None) -> dict[str, Any]:
    created_at = job.created_at.isoformat()
    return {
        "id": job.id,
        "recruiter_id": job.recruiter_id,
        "job_title": job.title,
        "company_name": job.company_name or (recruiter.company_name if recruiter else ""),
        "job_description": job.description,
        "required_skills": ", ".join(skills_from_json(job.skills)),
        "experience_required": job.experience,
        "employment_type": job.employment_type or "Full-time",
        "location": job.location or "Not specified",
        "salary_range": job.salary_range,
        "application_deadline": job.application_deadline,
        "status": "published" if job.status == "ACTIVE" else job.status.lower(),
        "created_at": created_at,
        "updated_at": created_at,
    }
