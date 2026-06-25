"""
# WORKFLOW NUMBER
# WORKFLOW 13 - APPLY TO JOB
#
# PURPOSE
# Create candidate applications and list recruiter-owned applications.
#
# INPUT
# Candidate id, job id, recruiter id, and database session.
#
# OUTPUT
# Application confirmation and recruiter application records.
#
# FLOW DESCRIPTION
# Candidate Applies -> Validate Candidate/Job -> Prevent Duplicate -> Save ->
# Recruiter Reads Applications.
"""

import json

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.database.models import Application, Job, Recruiter, User
from backend.app.services.candidate_resume_service import get_latest_candidate_resume
from backend.app.services.job_visibility import filter_candidate_open_jobs
from backend.app.workflows.candidate.workflow_04_resume_parsing.service import ensure_parsed_resume_data
from backend.app.workflows.candidate.workflow_06_matching.service import compare_skills, extract_resume_skills
from backend.app.workflows.candidate.workflow_12_auto_matching.service import build_resume_search_text, calculate_job_match_score
from backend.app.workflows.recruiter.workflow_10_job_posting.service import skills_from_json


def submit_job_application(job_id: int, candidate_id: int, db: Session) -> Application:
    candidate = (
        db.query(User)
        .filter(User.id == candidate_id, User.role == "candidate")
        .first()
    )
    if not candidate:
        raise ValueError("Candidate not found")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise ValueError("Job not found")

    if not filter_candidate_open_jobs(db.query(Job)).filter(Job.id == job.id).first():
        raise DeadlinePassedError("Applications are no longer accepted for this job.")

    duplicate = (
        db.query(Application)
        .filter(
            Application.candidate_id == candidate.id,
            Application.job_id == job.id,
        )
        .first()
    )
    if duplicate:
        raise DuplicateApplicationError("Candidate has already applied to this job")

    # Resume is required: it is the central source of truth for match scoring.
    resume = get_latest_candidate_resume(candidate_id=candidate.id, db=db)
    if not resume:
        raise MissingResumeError("A resume is required to apply. Please upload your resume before applying.")
    # Resume is guaranteed to exist at this point (validated above).
    matched_skills: list[str] = []
    missing_skills: list[str] = skills_from_json(job.skills)
    match_score: int | None = None
    try:
        parsed_resume = ensure_parsed_resume_data(resume=resume, db=db)
        resume_skills = extract_resume_skills(parsed_resume)
        matched_skills, missing_skills = compare_skills(
            resume_skills=resume_skills,
            required_skills=skills_from_json(job.skills),
        )
        match_score = calculate_job_match_score(
            resume_skills=resume_skills,
            resume_text=build_resume_search_text(resume=resume, parsed_resume=parsed_resume),
            parsed_resume=parsed_resume,
            job=job,
        )
    except (TypeError, ValueError):
        match_score = 0

    application = Application(
        candidate_id=candidate.id,
        recruiter_id=job.recruiter_id,
        job_id=job.id,
        resume_id=resume.id,
        match_score=match_score,
        matched_skills=json.dumps(matched_skills),
        missing_skills=json.dumps(missing_skills),
        application_status="APPLIED",
    )
    db.add(application)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise DuplicateApplicationError("Candidate has already applied to this job") from exc
    db.refresh(application)
    return application


def list_recruiter_applications(recruiter_id: int, db: Session) -> list[dict]:
    recruiter = db.query(Recruiter).filter(Recruiter.id == recruiter_id).first()
    if not recruiter:
        raise ValueError("Recruiter not found")

    rows = (
        db.query(Application, User, Job)
        .join(User, User.id == Application.candidate_id)
        .join(Job, Job.id == Application.job_id)
        .filter(
            Application.recruiter_id == recruiter_id,
            Job.recruiter_id == recruiter_id,
        )
        .order_by(Application.applied_at.desc(), Application.id.desc())
        .all()
    )
    return [
        {
            "application_id": application.id,
            "candidate_id": candidate.id,
            "candidate_name": candidate.full_name,
            "candidate_email": candidate.email,
            "job_id": job.id,
            "job_title": job.title,
            "status": application.application_status,
            "applied_at": application.applied_at,
        }
        for application, candidate, job in rows
    ]


def list_candidate_applications(candidate_id: int, db: Session) -> list[dict]:
    rows = (
        db.query(Application, Job)
        .join(Job, Job.id == Application.job_id)
        .filter(Application.candidate_id == candidate_id)
        .order_by(Application.applied_at.desc(), Application.id.desc())
        .all()
    )
    return [
        {
            "application_id": application.id,
            "job_id": job.id,
            "title": job.title,
            "skills": skills_from_json(job.skills),
            "experience": job.experience,
            "description": job.description,
            "company_name": job.company_name,
            "employment_type": job.employment_type,
            "location": job.location,
            "salary_range": job.salary_range,
            "application_deadline": job.application_deadline,
            "status": application.application_status,
            "applied_at": application.applied_at,
            "resume_id": application.resume_id,
            "match_score": application.match_score,
            "matched_skills": _skills_from_snapshot(application.matched_skills),
            "missing_skills": _skills_from_snapshot(application.missing_skills),
        }
        for application, job in rows
    ]


STATUS_TRANSITIONS = {
    "PENDING": {"UNDER_REVIEW", "REJECTED"},
    "APPLIED": {"UNDER_REVIEW", "REJECTED"},
    "UNDER_REVIEW": {"SHORTLISTED", "REJECTED"},
    "SHORTLISTED": {"INTERVIEW", "REJECTED"},
    "INTERVIEW": {"OFFER", "REJECTED"},
    "OFFER": {"HIRED", "REJECTED"},
    "HIRED": set(),
    "REJECTED": set(),
}


def update_application_status(application_id: int, recruiter_id: int, next_status: str, db: Session) -> dict:
    row = (
        db.query(Application, User, Job)
        .join(User, User.id == Application.candidate_id)
        .join(Job, Job.id == Application.job_id)
        .filter(
            Application.id == application_id,
            Application.recruiter_id == recruiter_id,
            Job.recruiter_id == recruiter_id,
        )
        .first()
    )
    if not row:
        raise ValueError("Application not found")
    application, candidate, job = row
    current = application.application_status.upper()
    if next_status != current and next_status not in STATUS_TRANSITIONS.get(current, set()):
        raise InvalidApplicationTransition(f"Cannot move application from {current} to {next_status}")
    application.application_status = next_status
    db.commit()
    db.refresh(application)
    return {
        "application_id": application.id,
        "candidate_id": candidate.id,
        "candidate_name": candidate.full_name,
        "candidate_email": candidate.email,
        "job_id": job.id,
        "job_title": job.title,
        "status": application.application_status,
        "applied_at": application.applied_at,
    }


class DuplicateApplicationError(ValueError):
    pass


class InvalidApplicationTransition(ValueError):
    pass


class MissingResumeError(ValueError):
    pass


class DeadlinePassedError(ValueError):
    pass


def _skills_from_snapshot(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        result = json.loads(value)
        return [str(skill) for skill in result] if isinstance(result, list) else []
    except (TypeError, json.JSONDecodeError):
        return []
